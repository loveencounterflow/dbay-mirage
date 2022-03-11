(function() {
  'use strict';
  var $, CND, GUY, HTMLISH, Moonriver, TIMETUNNEL, _HTMLISH, badge, debug, echo, freeze, help, info, isa, lets, rpr, thaw, type_of, types, urge, validate, validate_list_of, warn, whisper, xncr;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-MIRAGE/HTMLISH-PARSER';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  GUY = require('guy');

  _HTMLISH = (require('paragate/lib/htmlish.grammar')).new_grammar({
    bare: true
  });

  ({lets, freeze, thaw} = GUY.lft);

  TIMETUNNEL = require('timetunnel');

  ({Moonriver} = require('moonriver'));

  ({$} = Moonriver);

  //===========================================================================================================
  /* TAINT use more relaxed syntax for names */
  // G: grouped
  // O: optional
  xncr = {};

  xncr.nameG = /(?<name>[a-z][a-z0-9]*)/.source;

  xncr.nameOG = /(?:(?<csg>(?:[a-z][a-z0-9]*))|)/.source;

  xncr.hexG = /(?:x(?<hex>[a-fA-F0-9]+))/.source;

  xncr.decG = /(?<dec>[0-9]+)/.source;

  xncr.matcher = RegExp(`^&${xncr.nameG};|&${xncr.nameOG}\\#(?:${xncr.hexG}|${xncr.decG});$`);

  xncr.splitter = /(&[^\s;]+;)/;

  //===========================================================================================================
  this.Htmlish = (function() {
    class Htmlish {
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   return undefined

        //---------------------------------------------------------------------------------------------------------
      _tunnel(text) {
        var guards, intalph, tnl;
        /* TAINT do not reconstruct tunnel for each call */
        // guards    = 'äöüßp'
        // guards    = '①②③④⑤'
        guards = '¥₽₨฿₮';
        intalph = '0123456789';
        tnl = new TIMETUNNEL.Timetunnel({guards, intalph});
        tnl.add_tunnel(TIMETUNNEL.tunnels.keep_backslash);
        // tnl.add_tunnel TIMETUNNEL.tunnels.remove_backslash
        text = tnl.hide(text);
        return {
          text,
          reveal: tnl.reveal.bind(tnl)
        };
      }

      //---------------------------------------------------------------------------------------------------------
      _entity_token_from_match(d, start, stop, match) {
        var R, g, ref1;
        g = match.groups;
        R = {...d};
        R.$key = '^entity';
        R.text = match[0];
        R.start = start;
        R.stop = stop;
        if (g.name != null) {
          R.type = 'named';
          R.name = g.name;
        } else {
          R.type = g.csg != null ? 'xncr' : 'ncr';
          if (g.csg != null) {
            R.csg = g.csg;
          }
          R.$value = parseInt((ref1 = g.hex) != null ? ref1 : g.dec, (g.hex != null ? 16 : 10));
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _text_token_from_part(d, start, stop, part) {
        var R;
        R = {...d};
        R.text = part;
        R.start = start;
        R.stop = stop;
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      $add_location() {
        return (d, send) => {
          var col, lnr, ref1;
          [lnr, col] = (ref1 = d.$vnr) != null ? ref1 : [null, null];
          d.delta_lnr = lnr - 1;
          d.col = col;
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $set_syntax_on_otag(tag_catalog) {
        return (d, send) => {
          var ref1, ref2;
          if (!(d.$key === '<tag')) {
            return send(d);
          }
          d.syntax = (ref1 = (ref2 = tag_catalog[d.name]) != null ? ref2.syntax : void 0) != null ? ref1 : 'html';
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $convert_nonhtml_syntax() {
        var wait_for_name;
        wait_for_name = null;
        return (d, send) => {
          var e;
          if (wait_for_name != null) {
            //...................................................................................................
            if ((d.$key === '>tag') && (d.name === wait_for_name)) {
              wait_for_name = null;
              return send(d);
            }
            //...................................................................................................
            e = {...d};
            e.$key = '^rawtext';
            e.syntax = null;
            delete e.atrs;
            return send(e);
          }
          //.....................................................................................................
          if ((d.$key === '<tag') && (d.syntax !== 'html')) {
            wait_for_name = d.name;
          }
          //.....................................................................................................
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $set_syntax_on_ctag(tag_catalog) {
        var stack;
        stack = ['html'];
        return (d, send) => {
          var ref1, ref2;
          if (d.$key === '<tag') {
            stack.push((ref1 = d.syntax) != null ? ref1 : 'html');
          } else if (d.$key === '>tag') {
            stack.pop();
            d.syntax = (ref2 = stack[stack.length - 1]) != null ? ref2 : 'html';
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $parse_ncrs() {
        var xncr_matcher, xncr_splitter;
        xncr_matcher = this.constructor.C.xncr.matcher;
        xncr_splitter = this.constructor.C.xncr.splitter;
        return (d, send) => {
          var i, is_entity, len, match, part, parts, start, stop;
          if (!(d.$key === '^text')) {
            return send(d);
          }
          parts = d.text.split(xncr_splitter);
          if (!(parts.length > 1)) {
            return send(d);
          }
          is_entity = true;
          start = 0;
//.....................................................................................................
          for (i = 0, len = parts.length; i < len; i++) {
            part = parts[i];
            is_entity = !is_entity;
            if (part === '') {
              continue;
            }
            stop = start + part.length;
            //...................................................................................................
            if (is_entity && ((match = part.match(xncr_matcher)) != null)) {
              send(this._entity_token_from_match(d, start, stop, match));
            } else {
              send(this._text_token_from_part(d, start, stop, part));
            }
            //...................................................................................................
            start = stop;
          }
          return null;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $complain_about_bareachrs() {
        return (d, send) => {
          if (!(d.$key === '^text')) {
            return send(d);
          }
          //.....................................................................................................
          if (d.$key === '^text') {
            if (/(?<!\\)[<&]/.test(d.text)) {
              this._as_error(d, '^ð1^', 'bareachrs', "bare active characters");
            }
          }
          //.....................................................................................................
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $reveal_tunneled_text(reveal) {
        return (d, send) => {
          if (!((d.$key === '^text') || (d.$key === '^rawtext'))) {
            return send(d);
          }
          d.text = reveal(d.text);
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $remove_backslashes() {
        return (d, send) => {
          if (!(d.$key === '^text')) {
            return send(d);
          }
          d.text = d.text.replace(/\\</g, '&lt;');
          /* TAINT conflicts with NCR parsing */          d.text = d.text.replace(/\\&/g, '&amp;');
          /* TAINT conflicts with NCR parsing */          d.text = d.text.replace(/\\\n/ugs, '');
          /* replace escaped newlines with empty string */          d.text = d.text.replace(/\\(.)/ugs, '$1');
/* obliterate remaining backslashes (exc. escaped ones) */          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $treat_xws_in_opening_tags() {
        return (d, send) => {
          if (!(d.$key === '<tag')) {
            return send(d);
          }
          if ((d.type === 'otag') && (/^<\s+/.test(d.text))) {
            this._as_error(d, '^ð1^', 'xtraows', "extraneous whitespace before tag name");
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $treat_xws_in_closing_tags() {
        return (d, send) => {
          if (!(d.$key === '>tag')) {
            return send(d);
          }
          if ((d.type === 'ctag') && ((/^<\s*\/\s+/.test(d.text)) || (/^<\s+\/\s*/.test(d.text)))) {
            this._as_error(d, '^ð2^', 'xtracws', "extraneous whitespace in closing tag");
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $handle_stack_open(stack) {
        return (d, send) => {
          if (d.$key === '<tag') { // and ( d.type is 'ctag' )
            stack.push(d);
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $handle_stack_close(stack) {
        return (d, send) => {
          var matching_d;
          if (!(d.$key === '>tag')) {
            return send(d);
          }
          //.....................................................................................................
          if (stack.length === 0) {
            return send(this._as_error(d, '^ð2^', 'xtractag', `extraneous closing tag </${d.name}>`));
          }
          //.....................................................................................................
          matching_d = stack.pop();
          if (d.name != null) {
            if (d.name !== matching_d.name) {
              return send(this._as_error(d, '^ð2^', 'nomatch', `expected </${matching_d.name}>, got </${d.name}>`));
            }
          } else {
            //...................................................................................................
            d.name = matching_d.name;
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $relabel_rawtexts() {
        return function(d, send) {
          if (d.$key === '^rawtext') {
            d.$key = '^text';
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $consolidate_texts() {
        var collector, flush, last, send;
        last = Symbol('last');
        // prv_was_text  = false
        send = null;
        collector = [];
        //.......................................................................................................
        flush = function() {
          var d, e;
          // prv_was_text      = false
          if (collector.length === 0) {
            return;
          }
          d = collector[0];
          if (collector.length > 1) {
            d.text = ((function() {
              var i, len, results;
              results = [];
              for (i = 0, len = collector.length; i < len; i++) {
                e = collector[i];
                results.push(e.text);
              }
              return results;
            })()).join('');
            d.stop = collector[collector.length - 1].stop;
          }
          send(d);
          return collector.length = 0;
        };
        //.......................................................................................................
        return $({last}, function(d, _send) {
          send = _send;
          if (d === last) {
            return flush();
          }
          if (d.$key !== '^text') {
            flush();
            return send(d);
          }
          return collector.push(d);
        });
      }

      //---------------------------------------------------------------------------------------------------------
      $split_lines() {
        return (d, send) => {
          var e, i, idx, len, line, lines;
          if (!(d.$key === '^text')) {
            return send(d);
          }
          if (!((lines = d.text.split('\n')).length > 1)) {
            return send(d);
          }
          e = d;
/* TAINT makes `start`, `stop` invalid (but are thery still needed?) */
          for (idx = i = 0, len = lines.length; i < len; idx = ++i) {
            line = lines[idx];
            e = {...e};
            e.oln += idx;
            if (idx !== 0) {
              e.col = 1;
            }
            e.text = line;
            send(e);
          }
          return null;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      parse(text, tag_catalog = null) {
        var R, mr, reveal, stack, tokens;
        ({text, reveal} = this._tunnel(text));
        tokens = thaw(_HTMLISH.parse(text));
        stack = [];
        R = [];
        mr = new Moonriver();
        //-------------------------------------------------------------------------------------------------------
        mr.push(tokens);
        mr.push(this.$add_location());
        if (tag_catalog != null) {
          mr.push(this.$set_syntax_on_otag(tag_catalog));
        }
        if (tag_catalog != null) {
          mr.push(this.$convert_nonhtml_syntax());
        }
        if (tag_catalog != null) {
          mr.push(this.$set_syntax_on_ctag(tag_catalog));
        }
        mr.push(this.$parse_ncrs());
        mr.push(this.$complain_about_bareachrs());
        mr.push(this.$reveal_tunneled_text(reveal));
        mr.push(this.$remove_backslashes());
        mr.push(this.$treat_xws_in_opening_tags());
        mr.push(this.$treat_xws_in_closing_tags());
        mr.push(this.$handle_stack_open(stack));
        mr.push(this.$handle_stack_close(stack));
        mr.push(this.$relabel_rawtexts());
        mr.push(function(d) {
          return debug('^321^', d.$key, d.name, d.syntax);
        });
        // mr.push @$consolidate_texts()
        // mr.push @$split_lines()
        mr.push(function(d) {
          return R.push(d);
        });
        mr.drive();
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _as_error(token, ref, code, message) {
        token.$key = '^error';
        token.origin = 'htmlish';
        token.code = code;
        token.message = message;
        token.$ = ref;
        return token;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Htmlish.C = GUY.lft.freeze({
      xncr: xncr
    });

    return Htmlish;

  }).call(this);

  //-----------------------------------------------------------------------------------------------------------
  this.HTMLISH = HTMLISH = new this.Htmlish();

}).call(this);

//# sourceMappingURL=htmlish-parser.js.map