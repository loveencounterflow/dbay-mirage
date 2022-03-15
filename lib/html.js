(function() {
  'use strict';
  var CND, GUY, HDML, HTMLISH, PATH, SQL, badge, debug, echo, freeze, help, info, isa, lets, rpr, thaw, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-MIRAGE/HTML';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  PATH = require('path');

  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  GUY = require('guy');

  ({SQL} = GUY.str);

  ({HDML} = require('hdml'));

  ({lets, freeze, thaw} = GUY.lft);

  ({HTMLISH} = require('./htmlish-parser'));

  //===========================================================================================================
  types.declare('constructor_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "( @isa.object x.mrg ) or ( @isa.function x.mrg )": function(x) {
        return (this.isa.object(x.mrg)) || (this.isa.function(x.mrg));
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_parse_dsk_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      }
    }
  });

  //===========================================================================================================
  this.Html = (function() {
    class Html {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var mrg;
        this.cfg = {...this.constructor.C.defaults.constructor_cfg, ...cfg};
        GUY.props.hide(this, 'types', types);
        this.types.validate.constructor_cfg(this.cfg);
        ({mrg} = GUY.obj.pluck_with_fallback(this.cfg, null, 'mrg'));
        GUY.props.hide(this, 'mrg', mrg);
        GUY.props.hide(this, 'HTMLISH', HTMLISH);
        this.cfg = GUY.lft.freeze(this.cfg);
        this._swapper_catalog = null;
        this._syntax_catalog = null;
        if (typeof this._set_variables === "function") {
          this._set_variables();
        }
        if (typeof this._create_sql_functions === "function") {
          this._create_sql_functions();
        }
        if (typeof this._procure_infrastructure === "function") {
          this._procure_infrastructure();
        }
        if (typeof this._compile_statements === "function") {
          this._compile_statements();
        }
        if (typeof this._procure_infradata === "function") {
          this._procure_infradata();
        }
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _set_variables() {}

      //---------------------------------------------------------------------------------------------------------
      _create_sql_functions() {
        var prefix;
        ({prefix} = this.cfg);
        //-------------------------------------------------------------------------------------------------------
        this.mrg.db.create_window_function({
          name: `${prefix}_html_create_tag`,
          varargs: false,
          deterministic: true,
          start: null,
          step: (Σ, typ, tag, syntax, k, v, txt) => {
            var escape_ltamp;
            ({escape_ltamp} = this._syntax_catalog[syntax]);
            if (Σ == null) {
              Σ = {
                typ,
                tag,
                atrs: {},
                txt,
                escape_ltamp
              };
            }
            if (k != null) {
              Σ.atrs[k] = v;
            }
            return Σ;
          },
          inverse: function(Σ, dropped) {
            if (Σ == null) {
              return null;
            }
            delete Σ.atrs[k];
            return Σ;
          },
          result: function(Σ) {
            if (Σ == null) {
              return '';
            }
            switch (Σ.typ) {
              case 't':
                if (Σ.escape_ltamp) {
                  return HDML.escape_text(Σ.txt);
                } else {
                  return Σ.txt;
                }
                break;
              case 'r':
                return `<!-- ${HDML.escape_text(Σ.txt)} -->`;
              case 'b':
                return '\n';
              case 'e':
                return (HDML.create_tag('<', 'error', Σ.atrs)) + (HDML.escape_text(Σ.txt)) + (HDML.create_tag('>', 'error'));
              default:
                return HDML.create_tag(Σ.typ, Σ.tag, Σ.atrs);
            }
          }
        });
        //-------------------------------------------------------------------------------------------------------
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _procure_infrastructure() {
        /* TAINT skip if tables found */
        var db, prefix;
        ({prefix} = this.cfg);
        ({db} = this.mrg);
        db.set_foreign_keys_state(false);
        db(SQL`drop  index if exists ${prefix}_html_mirror_tag_idx;
drop  view  if exists ${prefix}_html_tags_and_html;
drop  table if exists ${prefix}_html_syntaxes;
drop  table if exists ${prefix}_html_swapper_matches;
drop  table if exists ${prefix}_html_swappers;
drop  table if exists ${prefix}_html_tags;
drop  table if exists ${prefix}_html_typs;
drop  table if exists ${prefix}_html_atrs;
drop  table if exists ${prefix}_html_mirror;
drop  table if exists ${prefix}_html_atrids;`);
        db.set_foreign_keys_state(true);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_syntaxes (
    syntax              text    not null primary key,
    remove_backslashes  boolean not null default false,
    expand_ncrs         boolean not null default false,
    escape_ltamp        boolean not null default false );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_swappers (
    name                text    not null primary key,
    syntax              text    not null references ${prefix}_html_syntaxes,
    environment         text    not null,
    open                text,
    close               text,
    either              text,
  check ( ( open is     null and close is     null and either is not  null ) or
          ( open is not null and close is not null and either is      null ) ) );`);
        //-------------------------------------------------------------------------------------------------------
        // create table #{prefix}_html_zones (
        db(SQL`create table ${prefix}_html_swapper_matches (
    dsk                 text    not null,
    oln                 integer not null,
    trk                 integer not null default 1,
    pce                 integer not null default 1,
    start               integer not null,
    stop                integer not null,
    role                text    not null,
    swapper             text    not null references ${prefix}_html_swappers ( name ),
  foreign key ( dsk, oln, trk, pce ) references ${prefix}_raw_mirror );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_tags (
    tag                 text    not null primary key,
    is_block            boolean not null default false,
    is_empty            boolean not null default false,
    syntax              text    not null default 'html' references ${prefix}_html_syntaxes );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_atrids (
    atrid integer not null,
  primary key ( atrid ),
  check ( atrid > 0 and floor( atrid ) = atrid ) );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_atrs (
    atrid integer not null,
    k     text    not null,
    v     text    not null,
  primary key ( atrid, k ),
  foreign key ( atrid ) references ${prefix}_html_atrids,
  check ( length( k ) > 0 ) )
  strict;`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_typs (
    typ   text not null,
    name  text not null,
    primary key ( typ ),
    unique ( name ),
    check ( length( typ  ) = 1 ),
    check ( length( name ) > 0 ) );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`insert into ${prefix}_html_typs values
    ( '<', 'otag'     ),
    ( '>', 'ctag'     ),
    ( '^', 'stag'     ),
    ( 'b', 'blank'    ),
    ( 't', 'text'     ),
    ( 'r', 'comment'  ),
    ( 'e', 'error'    );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_mirror (
    dsk     text    not null,                         -- data source key
    oln     integer not null,                         -- original line nr (1-based)
    col     integer not null,                         -- column where \`txt\` starts
    trk     integer not null default 1,               -- track number
    pce     integer not null default 1,               -- piece number
    typ     text    not null,                         -- node type
    tag     text,                                     -- null for texts, comments
    syntax  text    references ${prefix}_html_syntaxes,
    atrid   integer,
    -- act     boolean not null default 1,               -- true: active, false: deleted
    txt     text,
  primary key ( dsk, oln, trk, pce ),
  foreign key ( dsk   ) references ${prefix}_datasources,
  foreign key ( typ   ) references ${prefix}_html_typs,
  foreign key ( atrid ) references ${prefix}_html_atrids,
  check ( length( tag ) > 0 ) );
create index ${prefix}_html_mirror_tag_idx on ${prefix}_html_mirror ( tag );`);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create view ${prefix}_html_tags_and_html as select distinct
    t.dsk                                                                       as dsk,
    t.oln                                                                       as oln,
    t.col                                                                       as col,
    t.trk                                                                       as trk,
    t.pce                                                                       as pce,
    t.typ                                                                       as typ,
    t.tag                                                                       as tag,
    t.syntax                                                                    as syntax,
    t.atrid                                                                     as atrid,
    ${prefix}_html_create_tag( t.typ, t.tag, t.syntax, a.k, a.v, t.txt ) over w as html
  from
    ${prefix}_html_mirror as t
    left join ${prefix}_html_atrs as a using ( atrid )
  where true
    and ( t.dsk = std_getv( 'dsk' ) )
  window w as (
    partition by t.dsk, t.oln, t.trk, t.pce
    order by a.k
    rows between unbounded preceding and unbounded following )
  order by t.dsk, t.oln, t.trk, t.pce;`);
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _procure_infradata() {
        /* TAINT skip if tables found */
        var db, html_data, insert_swapper, insert_syntax, insert_tag, prefix;
        ({prefix} = this.cfg);
        ({db} = this.mrg);
        ({insert_syntax, insert_swapper, insert_tag} = this.statements);
        html_data = require('./data-html5-tags');
        this._swapper_catalog = {};
        //.......................................................................................................
        db(() => {
          var d, error, escape_ltamp, expand_ncrs, i, len, ref, remove_backslashes, results, syntax;
          try {
            ref = html_data.syntaxes;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              d = ref[i];
              syntax = d.syntax;
              remove_backslashes = d.remove_backslashes ? 1 : 0;
              expand_ncrs = d.expand_ncrs ? 1 : 0;
              escape_ltamp = d.escape_ltamp ? 1 : 0;
              results.push(insert_syntax.run({syntax, remove_backslashes, expand_ncrs, escape_ltamp}));
            }
            return results;
          } catch (error1) {
            error = error1;
            throw new db.E.DBay_internal_error('^mirage-html@1^', `when trying to insert ${rpr(d)}, an error occurred: ${error.message}`);
          }
        });
        //.......................................................................................................
        db(() => {
          var close, d, either, environment, error, i, len, name, open, ref, ref1, ref2, ref3, results, syntax;
          try {
            ref = html_data.swappers;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              d = ref[i];
              ({name, environment, syntax, open, close, either} = d);
              this._swapper_catalog[name] = {name, environment, syntax, open, close, either};
              open = (ref1 = open != null ? open.source : void 0) != null ? ref1 : null;
              close = (ref2 = close != null ? close.source : void 0) != null ? ref2 : null;
              either = (ref3 = either != null ? either.source : void 0) != null ? ref3 : null;
              results.push(insert_swapper.run({name, environment, syntax, open, close, either}));
            }
            return results;
          } catch (error1) {
            error = error1;
            throw new db.E.DBay_internal_error('^mirage-html@2^', `when trying to insert ${rpr(d)}, an error occurred: ${error.message}`);
          }
        });
        //.......................................................................................................
        db(() => {
          var d, error, i, is_block, is_empty, len, ref, ref1, results, syntax, tag;
          try {
            ref = html_data.tags;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              d = ref[i];
              tag = d.tag;
              is_empty = d.is_empty ? 1 : 0;
              is_block = d.is_block ? 1 : 0;
              syntax = (ref1 = d.syntax) != null ? ref1 : 'html';
              results.push(insert_tag.run({tag, is_empty, is_block, syntax}));
            }
            return results;
          } catch (error1) {
            error = error1;
            throw new db.E.DBay_internal_error('^mirage-html@3^', `when trying to insert ${rpr(d)}, an error occurred: ${error.message}`);
          }
        });
        //.......................................................................................................
        /* TAINT caching this value means we must be careful with additions; use better solution */
        /* TAINT unify methods */
        this._syntax_catalog = freeze(this._get_syntax_catalog());
        this._swapper_catalog = freeze(this._swapper_catalog);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      /* TAINT consider to cache */
      _get_syntax_catalog() {
        return this.mrg.db.as_object('syntax', SQL`select
    *
  from ${this.cfg.prefix}_html_syntaxes;`);
      }

      //---------------------------------------------------------------------------------------------------------
      /* TAINT consider to cache */
      _get_tag_catalog() {
        return this.mrg.db.as_object('tag', SQL`select
    *
  from ${this.cfg.prefix}_html_tags
  where ( syntax != 'html' ) or ( is_block ) or ( is_empty );`);
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_statements() {
        var db, prefix;
        ({prefix} = this.cfg);
        ({db} = this.mrg);
        //.......................................................................................................
        GUY.props.hide(this, 'statements', {
          //.....................................................................................................
          insert_atrid: db.prepare_insert({
            into: `${prefix}_html_atrids`,
            returning: '*',
            exclude: ['atrid']
          }),
          //.....................................................................................................
          /* NOTE we don't use `autoincrement` b/c this is the more general solution; details will change when
               the VNR gets more realistic (dsk, linenr, ...) */
          insert_content: db.prepare(SQL`with v1 as ( select
    coalesce( max( pce ), 0 ) + 1 as pce
  from ${prefix}_html_mirror
  where true
    and ( dsk = $dsk )
    and ( oln = $oln )
    and ( trk = $trk ) )
insert into ${prefix}_html_mirror ( dsk, oln, col, trk, pce, typ, tag, syntax, atrid, txt )
  values ( $dsk, $oln, $col, $trk, ( select pce from v1 ), $typ, $tag, $syntax, $atrid, $txt )
  returning *;`),
          //.....................................................................................................
          insert_atr: db.prepare_insert({
            into: `${prefix}_html_atrs`,
            returning: null
          }),
          insert_tag: db.prepare_insert({
            into: `${prefix}_html_tags`,
            returning: null
          }),
          insert_syntax: db.prepare_insert({
            into: `${prefix}_html_syntaxes`,
            returning: null
          }),
          insert_swapper: db.prepare_insert({
            into: `${prefix}_html_swappers`,
            returning: null
          }),
          insert_swapper_matches: db.prepare_insert({
            into: `${prefix}_html_swapper_matches`,
            returning: null
          })
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      render_dsk(cfg) {
        var db, dsk, prefix;
        ({dsk} = cfg);
        ({db} = this.mrg);
        ({prefix} = this.cfg);
        db.setv('dsk', dsk);
        return (db.all_first_values(SQL`select html from ${prefix}_html_tags_and_html;`)).join('');
      }

      //---------------------------------------------------------------------------------------------------------
      _append_tag(dsk, oln, col, trk, typ, tag, syntax, atrs = null, text = null) {
        var atrid, k, v;
        atrid = null;
        if (atrs != null) {
          ({atrid} = this.mrg.db.first_row(this.statements.insert_atrid));
          for (k in atrs) {
            v = atrs[k];
            if (!isa.text(v)) {
              v = rpr(v);
            }
            this.statements.insert_atr.run({atrid, k, v});
          }
        }
        return this.statements.insert_content.get({
          dsk,
          oln,
          col,
          trk,
          typ,
          tag,
          syntax,
          atrid,
          txt: text
        });
      }

      //---------------------------------------------------------------------------------------------------------
      parse_dsk(cfg) {
        var dsk;
        validate.mrg_parse_dsk_cfg((cfg = {...this.constructor.C.defaults.mrg_parse_dsk_cfg, ...cfg}));
        ({dsk} = cfg);
        this._collect_swapper_matches({dsk});
        //.......................................................................................................
        this.mrg.db.with_transaction(() => {
          var _, atrs, col, d, i, len, oln, oln1, par, pce, ref, ref1, ref2, ref3, results, syntax, tokens, trk, txt, wslc, y;
          ref = this.mrg.walk_par_rows({dsk});
          results = [];
          for (y of ref) {
            ({oln1, wslc, trk, pce, par, txt} = y);
            // debug '^598^', dsk, oln1, par, rpr txt
            tokens = this.HTMLISH.parse(txt, this._get_tag_catalog());
            oln = null;
            col = null;
            syntax = null;
//...................................................................................................
            for (i = 0, len = tokens.length; i < len; i++) {
              d = tokens[i];
              oln = (ref1 = oln1 + d.delta_lnr) != null ? ref1 : 0;
              col = d.col;
              syntax = (ref2 = d.syntax) != null ? ref2 : 'html';
              switch (d.$key) {
                case '<tag':
                  this._append_tag(dsk, oln, col, trk, '<', d.name, syntax, d.atrs);
                  break;
                case '>tag':
                  this._append_tag(dsk, oln, col, trk, '>', d.name, syntax, d.atrs);
                  break;
                case '^tag':
                  this._append_tag(dsk, oln, col, trk, '^', d.name, syntax, d.atrs);
                  break;
                case '^text':
                  this._append_tag(dsk, oln, col, trk, 't', null, syntax, null, d.text);
                  break;
                case '^entity':
                  this._append_tag(dsk, oln, col, trk, 't', null, syntax, null, d.text);
                  break;
                case '^comment':
                case '^doctype':
                  this._append_tag(dsk, oln, col, trk, 'r', null, syntax, null, d.text.replace(/^<!--\s*(.*?)\s*-->$/, '$1'));
                  break;
                case '^error':
                  warn('^435345^', `error ${rpr(d)}`);
                  atrs = {
                    start: d.start,
                    stop: d.stop,
                    code: d.code,
                    ref: (ref3 = d.$) != null ? ref3 : '?'
                  };
                  this._append_tag(dsk, oln, col, trk, 'e', null, syntax, atrs, `${d.message}: ${rpr(d.text)}`);
                  break;
                default:
                  warn('^435345^', `unhandled token ${rpr(d)}`);
                  atrs = {
                    start: d.start,
                    stop: d.stop,
                    code: 'unhandled',
                    ref: '^mirage-html@4^'
                  };
                  d = {
                    $key: d.$key,
                    name: d.name,
                    type: d.type
                  };
                  this._append_tag(dsk, oln, col, trk, 'e', null, syntax, atrs, `unhandled token: ${rpr(d)}`);
              }
            }
            //...................................................................................................
            if (oln == null) {
              oln = oln1;
            }
            if (col == null) {
              col = 1;
            }
            if (syntax == null) {
              syntax = 'html';
            }
            results.push((function() {
              var j, ref4, results1;
              results1 = [];
              for (_ = j = 1, ref4 = wslc + 1; (1 <= ref4 ? j <= ref4 : j >= ref4); _ = 1 <= ref4 ? ++j : --j) {
                results1.push(this._append_tag(dsk, oln, col, trk, 'b', null, syntax, null, '\n'));
              }
              return results1;
            }).call(this));
          }
          return results;
        });
        return null;
      }

      //=========================================================================================================
      // SYNTAX FENCES
      //---------------------------------------------------------------------------------------------------------
      * _walk_pattern_matches(text, pattern) {
        var match, ref;
        ref = text.matchAll(pattern);
        for (match of ref) {
          yield ({
            start: match.index,
            stop: match.index + match[0].length
          });
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_zone_candidates(text) {
        var R, close, d, either, hit, open, ref, ref1, ref2, ref3, swapper, syntax;
        R = [];
        ref = this._swapper_catalog;
        for (swapper in ref) {
          d = ref[swapper];
          ({syntax, open, close, either} = d);
          if (either != null) {
            ref1 = this._walk_pattern_matches(text, either);
            for (hit of ref1) {
              R.push({
                swapper,
                syntax,
                role: 'either',
                ...hit
              });
            }
          } else {
            ref2 = this._walk_pattern_matches(text, open);
            for (hit of ref2) {
              R.push({
                swapper,
                syntax,
                role: 'open',
                ...hit
              });
            }
            ref3 = this._walk_pattern_matches(text, close);
            for (hit of ref3) {
              R.push({
                swapper,
                syntax,
                role: 'close',
                ...hit
              });
            }
          }
        }
        R.sort(function(a, b) {
          if (a.start > b.start) {
            return +1;
          }
          if (a.start < b.start) {
            return -1;
          }
          if (a.stop > b.stop) {
            return +1;
          }
          if (a.stop < b.stop) {
            return -1;
          }
          return 0;
        });
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _collect_swapper_matches(cfg) {
        /* TAINT should be a stack to allow for multiply nested syntaxes */
        var cache, current_swapper, d, dsk, i, j, len, len1, oln, pce, ref, ref1, role, row, start, stop, swapper, trk, txt, y;
        ({dsk} = cfg);
        cache = [];
        current_swapper = null;
        ref = this.mrg.walk_line_rows({dsk});
        for (y of ref) {
          ({oln, trk, pce, txt} = y);
          ref1 = this._get_zone_candidates(txt);
          for (i = 0, len = ref1.length; i < len; i++) {
            d = ref1[i];
            ({role, swapper, start, stop} = d);
            swapper = this._swapper_catalog[swapper];
            if (current_swapper != null) {
              if (role === 'either') {
                if (current_swapper === swapper.name) {
                  current_swapper = null;
                  role = 'close';
                } else {
                  continue;
                }
              } else {
                if (!((swapper.name === current_swapper) && (role === 'close'))) {
                  continue;
                }
                current_swapper = null;
              }
            } else {
              if (role === 'either') {
                current_swapper = swapper.name;
                role = 'open';
              } else {
                if (!(role === 'open')) {
                  continue;
                }
                current_swapper = swapper.name;
              }
            }
            cache.push({
              dsk,
              oln,
              trk,
              pce,
              start,
              stop,
              role,
              swapper: swapper.name
            });
          }
        }
        for (j = 0, len1 = cache.length; j < len1; j++) {
          row = cache[j];
          //.......................................................................................................
          this.mrg.db(this.statements.insert_swapper_matches, row);
        }
        cache.length = 0;
        //.......................................................................................................
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Html.C = GUY.lft.freeze({
      defaults: {
        //.....................................................................................................
        constructor_cfg: {
          mrg: null,
          prefix: null
        }
      }
    });

    return Html;

  }).call(this);

}).call(this);

//# sourceMappingURL=html.js.map