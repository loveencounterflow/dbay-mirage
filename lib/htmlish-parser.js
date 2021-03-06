(function() {
  'use strict';
  var $, CND, GUY, HDML, HTMLISH, Moonriver, TIMETUNNEL, _HTMLISH, _html_data, badge, debug, echo, freeze, help, html_tags, info, isa, lets, rpr, thaw, type_of, types, urge, validate, validate_list_of, warn, whisper, xncr;

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

  ({HDML} = require('hdml'));

  _html_data = require('./data-html5-tags');

  html_tags = {};

  (() => {
    var d, i, len, ref1, results;
    ref1 = _html_data.tags;
    results = [];
    for (i = 0, len = ref1.length; i < len; i++) {
      d = ref1[i];
      results.push(html_tags[d.tag] = d);
    }
    return results;
  })();

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
        // guards    = '????????p'
        // guards    = '???????????????'
        guards = '??????????????';
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

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      $tunnel(tunnel_wrap) {
        return (text, send) => {
          var reveal;
          ({text, reveal} = this._tunnel(text));
          tunnel_wrap.reveal = reveal;
          send(text);
          return null;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $reveal_tunneled_text(tunnel_wrap) {
        return (d, send) => {
          if (!((d.$key === '^text') || (d.$key === '^rawtext'))) {
            return send(d);
          }
          d.text = tunnel_wrap.reveal(d.text);
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $transpile_markdownish() {
        var md, mdit_cfg;
        mdit_cfg = {
          html: true, // Enable HTML tags in source
          xhtmlOut: false, // Use '/' to close single tags (<br />).
          breaks: false, // Convert '\n' in paragraphs into <br>
          langPrefix: 'language-', // CSS language prefix for fenced blocks.
          linkify: false, // Autoconvert URL-like text to links
          typographer: false, // see https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/replacements.js
          quotes: '????????????', // '????????????' for German, ['??\xA0', '\xA0??', '???\xA0', '\xA0???'] for French
          highlight: null // function (/*str, lang*/) { return ''; }
        };
        // md = ( require 'markdown-it' ) 'zero'
        md = (require('markdown-it'))(mdit_cfg);
        md.enable('emphasis');
        // md.enable 'autolink'
        md.enable('backticks');
        md.disable('entity');
        // md.enable 'escape'
        // md.enable 'html_inline'
        // md.enable 'image'
        md.enable('link');
        // md.enable 'newline'
        // md.enable 'text'
        // md.enable 'balance_pairs'
        // md.enable 'text_collapse'
        md.disable('smartquotes');
        return (text, send) => {
          text = md.renderInline(text);
          text = text.replace(/&lt;/g, '<');
          text = text.replace(/&gt;/g, '>');
          text = text.replace(/&amp;/g, '&');
          return send(text);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $parse_htmlish() {
        return (text, send) => {
          var d, i, len, ref1, results;
          ref1 = thaw(_HTMLISH.parse(text));
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            d = ref1[i];
            results.push(send(d));
          }
          return results;
        };
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
      $add_otext() {
        return (d, send) => {
          d.otext = d.text;
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
      $set_syntax_on_other_tokens(tag_catalog) {
        var stack;
        stack = ['html'];
        return (d, send) => {
          var ref1, ref2;
          if (d.$key === '<tag') {
            stack.push((ref1 = d.syntax) != null ? ref1 : 'html');
          } else if (d.$key === '>tag') {
            stack.pop();
          }
          d.syntax = (ref2 = stack[stack.length - 1]) != null ? ref2 : 'html';
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
              this._as_error(d, '^??1^', 'bareachrs', "bare active characters");
            }
          }
          //.....................................................................................................
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
          var ref1;
          if (!(d.$key === '<tag')) {
            return send(d);
          }
          if (((ref1 = d.type) === 'otag' || ref1 === 'ntag') && (/^<\s+/.test(d.text))) {
            if (d.name == null) {
              d.name = 'WHITESPACE';
            }
            this._as_error(d, '^??1^', 'xtraows', "extraneous whitespace before tag name");
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
            if (d.name == null) {
              d.name = 'WHITESPACE';
            }
            this._as_error(d, '^??2^', 'xtracws', "extraneous whitespace in closing tag");
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $validate_paired_tags() {
        var stack;
        stack = [];
        return (d, send) => {
          var matching_d;
          if (d.$key === '<tag') {
            stack.push(d);
            send(d);
          //.....................................................................................................
          } else if (d.$key === '>tag') {
            //...................................................................................................
            if (stack.length === 0) {
              return send(this._as_error(d, '^??2^', 'xtractag', `extraneous closing tag </${d.name}>`));
            }
            //...................................................................................................
            matching_d = stack.pop();
            if (d.name != null) {
              if (d.name !== matching_d.name) {
                return send(this._as_error(d, '^??2^', 'nomatch', `expected </${matching_d.name}>, got </${d.name}>`));
              }
            } else {
              //...................................................................................................
              d.name = matching_d.name;
            }
            send(d);
          } else {
            //.....................................................................................................
            send(d);
          }
          //.....................................................................................................
          return null;
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
          collector.push(d);
          return null;
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
      $normalize_html() {
        return (d, send) => {
          var e, ref1;
          if ((d.type == null) || ((ref1 = d.$key) === '^text' || ref1 === '^entity' || ref1 === '^error')) {
            return send(d);
          }
          switch (d.type) {
            case 'otag':
              d.type = 'open';
              break;
            // d.text  = H
            case 'ctag':
              d.type = 'close';
              break;
            case 'ntag':
              // d.text  = HDML.open d.name, d.atrs
              d.type = 'open';
              break;
            case 'nctag':
              // d.text  = HDML.close d.name
              d.type = 'close';
              break;
            case 'stag':
              d.type = 'open';
              // d.text  = HDML.open d.name, d.atrs
              send(d);
              e = {...d};
              delete e.atrs;
              e.type = 'close';
              // e.text  = HDML.close d.name
              send(e);
              return null;
            default:
              d.message = `unhandled d.type: ${rpr(d.type)} (${rpr(d)})`;
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $normalize_atrs() {
        return (d, send) => {
          var atrs;
          if (d.type !== 'open') {
            return send(d);
          }
          atrs = {};
          if (d.id != null) {
            atrs.id = d.id;
          }
          if (d.class != null) {
            atrs.class = d.class.join(' ');
          }
          Object.assign(atrs, d.atrs);
          d.atrs = atrs;
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $normalize_token_keys() {
        var keys;
        keys = [
          '$vnr',
          '$key',
          'type',
          'prefix',
          'name',
          'id',
          'class',
          'atrs',
          'start',
          'stop',
          'text',
          'otext',
          // '$'
          'code'/* { $key: '^error', } */
          ,
          // 'chvtname'  ### { $key: '^error', } ###
          // 'origin'    ### { $key: '^error', } ###
          'message'/* { $key: '^error', } */
          
        ];
        return (d, send) => {
          var R, i, key, len, ref1;
          R = {};
          for (i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            R[key] = (ref1 = d[key]) != null ? ref1 : null;
          }
          send(R);
          return null;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      $normalize_tag_texts() {
        return (d, send) => {
          switch (d.type) {
            case null:
              null;
              break;
            case 'open':
              d.text = HDML.open(d.name, d.atrs);
              break;
            case 'close':
              d.text = HDML.close(d.name, d.atrs);
          }
          return send(d);
        };
      }

      //---------------------------------------------------------------------------------------------------------
      parse(text, tag_catalog = null) {
        /* TAINT use `cfg` pattern */
        /* TAINT do not reconstruct pipeline on each run */
        var R, mr, tunnel_wrap;
        tunnel_wrap = {};
        R = [];
        mr = new Moonriver();
        //-------------------------------------------------------------------------------------------------------
        mr.push([text]);
        mr.push(this.$tunnel(tunnel_wrap));
        mr.push(this.$transpile_markdownish());
        // mr.push ( text ) -> info '^394^', rpr text
        mr.push(this.$parse_htmlish());
        mr.push(this.$add_location());
        mr.push(this.$add_otext());
        if (tag_catalog != null) {
          mr.push(this.$set_syntax_on_otag(tag_catalog));
        }
        if (tag_catalog != null) {
          mr.push(this.$convert_nonhtml_syntax());
        }
        if (tag_catalog != null) {
          mr.push(this.$set_syntax_on_other_tokens(tag_catalog));
        }
        mr.push(this.$parse_ncrs());
        mr.push(this.$complain_about_bareachrs());
        mr.push(this.$reveal_tunneled_text(tunnel_wrap));
        mr.push(this.$remove_backslashes());
        mr.push(this.$treat_xws_in_opening_tags());
        // mr.push ( d ) -> debug '^5569-1^', d.name ? '##############', d if d.$key is '<tag'
        mr.push(this.$treat_xws_in_closing_tags());
        mr.push(this.$validate_paired_tags());
        mr.push(this.$relabel_rawtexts());
        mr.push(this.$normalize_html());
        mr.push(this.$normalize_atrs());
        mr.push(this.$normalize_token_keys());
        mr.push(this.$normalize_tag_texts());
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