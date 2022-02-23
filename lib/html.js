(function() {
  'use strict';
  var CND, GUY, HDML, HTMLISH, Htmlish, PATH, SQL, _HTMLISH, badge, debug, echo, freeze, help, info, isa, lets, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

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

  _HTMLISH = (require('paragate/lib/htmlish.grammar')).new_grammar({
    bare: true
  });

  ({lets, freeze} = GUY.lft);

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
  Htmlish = class Htmlish {
    // #---------------------------------------------------------------------------------------------------------
    // constructor: ->
    //   return undefined

      //---------------------------------------------------------------------------------------------------------
    parse(text) {
      var R, tokens;
      tokens = _HTMLISH.parse(text);
      R = lets(tokens, (tokens) => {
        var d, i, idx, len;
        for (idx = i = 0, len = tokens.length; i < len; idx = ++i) {
          d = tokens[idx];
          // warn '^44564976^', d if d.$key is '^error'
          if (d.$key === '<tag') {
            if (d.type === 'otag') {
              if (/^<\s+/.test(d.text)) {
                this._as_error(d, '^ð1^', 'xtraows', "extraneous whitespace before tag name");
              }
            }
          } else if (d.$key === '>tag') {
            if (d.type === 'ctag') {
              if ((/^<\s*\/\s+/.test(d.text)) || (/^<\s+\/\s*/.test(d.text))) {
                this._as_error(d, '^ð2^', 'xtracws', "extraneous whitespace in closing tag");
              }
            }
          } else if (d.$key === '^text') {
            if (/(?<!\\)[<&]/.test(d.text)) {
              this._as_error(d, '^ð1^', 'bareachrs', "bare active characters");
            }
          }
        }
        return null;
      });
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _as_error(token, ref, code, message) {
      token.$key = '^error';
      token.origin = 'htmlish';
      token.code = code;
      token.message = message;
      token.$ = ref;
      return null;
    }

  };

  //-----------------------------------------------------------------------------------------------------------
  HTMLISH = new Htmlish();

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
          step: function(Σ, typ, tag, k, v, txt) {
            if (Σ == null) {
              Σ = {
                typ,
                tag,
                atrs: {},
                txt
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
                return HDML.escape_text(Σ.txt);
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
drop  table if exists ${prefix}_html_typs;
drop  table if exists ${prefix}_html_atrs;
drop  table if exists ${prefix}_html_mirror;
drop  table if exists ${prefix}_html_atrids;`);
        db.set_foreign_keys_state(true);
        //-------------------------------------------------------------------------------------------------------
        db(SQL`create table ${prefix}_html_atrids (
    atrid integer not null,
  primary key ( atrid ),
  check ( atrid > 0 and floor( atrid ) = atrid ) );`);
        db(SQL`create table ${prefix}_html_atrs (
    atrid integer not null,
    k     text    not null,
    v     text    not null,
  primary key ( atrid, k ),
  foreign key ( atrid ) references ${prefix}_html_atrids,
  check ( length( k ) > 0 ) )
  strict;`);
        db(SQL`create table ${prefix}_html_typs (
    typ   text not null,
    name  text not null,
    primary key ( typ ),
    unique ( name ),
    check ( length( typ  ) = 1 ),
    check ( length( name ) > 0 ) );`);
        db(SQL`insert into ${prefix}_html_typs values
    ( '<', 'otag'     ),
    ( '>', 'ctag'     ),
    ( '^', 'stag'     ),
    ( 'b', 'blank'    ),
    ( 't', 'text'     ),
    ( 'r', 'comment'  ),
    ( 'e', 'error'    );`);
        db(SQL`create table ${prefix}_html_mirror (
    dsk     text    not null,                         -- data source key
    oln     integer not null,                         -- original line nr (1-based)
    trk     integer not null default 1,               -- track number
    pce     integer not null default 1,               -- piece number
    typ     text    not null,                         -- node type
    tag     text,                                     -- null for texts, comments
    atrid   integer,
    -- act     boolean not null default 1,               -- true: active, false: deleted
    txt   text,
  primary key ( dsk, oln, trk, pce ),
  foreign key ( dsk   ) references ${prefix}_datasources,
  foreign key ( typ   ) references ${prefix}_html_typs,
  foreign key ( atrid ) references ${prefix}_html_atrids,
  check ( length( tag ) > 0 ) );
create index ${prefix}_html_mirror_tag_idx on ${prefix}_html_mirror ( tag );`);
        db(SQL`create view ${prefix}_html_tags_and_html as select distinct
    t.dsk                                                               as dsk,
    t.oln                                                               as oln,
    t.trk                                                               as trk,
    t.pce                                                               as pce,
    t.typ                                                               as typ,
    t.tag                                                               as tag,
    t.atrid                                                             as atrid,
    ${prefix}_html_create_tag( t.typ, t.tag, a.k, a.v, t.txt ) over w   as html
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
      _compile_statements() {
        var db, prefix;
        ({prefix} = this.cfg);
        ({db} = this.mrg);
        //.......................................................................................................
        GUY.props.hide(this, 'statements', {
          insert_atrid: db.prepare_insert({
            into: `${prefix}_html_atrids`,
            returning: '*',
            exclude: ['atrid']
          }),
          /* NOTE we don't use `autoincrement` b/c this is the more general solution; details will change when
               the VNR gets more realistic (dsk, linenr, ...) */
          insert_content: db.prepare(SQL`with v1 as ( select
    coalesce( max( pce ), 0 ) + 1 as pce
  from ${prefix}_html_mirror
  where true
    and ( dsk = $dsk )
    and ( oln = $oln )
    and ( trk = $trk ) )
insert into ${prefix}_html_mirror ( dsk, oln, trk, pce, typ, tag, atrid, txt )
  values ( $dsk, $oln, $trk, ( select pce from v1 ), $typ, $tag, $atrid, $txt )
  returning *;`),
          insert_atr: db.prepare_insert({
            into: `${prefix}_html_atrs`,
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
      _append_tag(dsk, oln, trk, typ, tag, atrs = null, text = null) {
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
          trk,
          typ,
          tag,
          atrid,
          txt: text
        });
      }

      //---------------------------------------------------------------------------------------------------------
      parse_dsk(cfg) {
        var dsk;
        validate.mrg_parse_dsk_cfg((cfg = {...this.constructor.C.defaults.mrg_parse_dsk_cfg, ...cfg}));
        ({dsk} = cfg);
        //.......................................................................................................
        this.mrg.db.with_transaction(() => {
          var _, atrs, d, i, len, oln, ref1, results, tokens, trk, txt, wslc, y;
          ref1 = this.mrg.get_par_rows({dsk});
          results = [];
          for (y of ref1) {
            ({
              oln1: oln,
              wslc,
              trk,
              txt
            } = y);
            tokens = this.HTMLISH.parse(txt);
            for (i = 0, len = tokens.length; i < len; i++) {
              d = tokens[i];
              switch (d.$key) {
                case '<tag':
                  this._append_tag(dsk, oln, trk, '<', d.name, d.atrs);
                  break;
                case '>tag':
                  this._append_tag(dsk, oln, trk, '>', d.name, d.atrs);
                  break;
                case '^tag':
                  this._append_tag(dsk, oln, trk, '^', d.name, d.atrs);
                  break;
                case '^text':
                  this._append_tag(dsk, oln, trk, 't', null, null, d.text);
                  break;
                case '^comment':
                  this._append_tag(dsk, oln, trk, 'r', null, null, d.text.replace(/^<!--\s*(.*?)\s*-->$/, '$1'));
                  break;
                case '^error':
                  atrs = {
                    start: d.start,
                    stop: d.stop,
                    code: d.code
                  };
                  this._append_tag(dsk, oln, trk, 'e', null, atrs, `${d.message}: ${rpr(d.text)}`);
                  break;
                default:
                  warn('^435345^', `unhandled token ${rpr(d)}`);
                  atrs = {
                    start: d.start,
                    stop: d.stop,
                    code: 'unhandled'
                  };
                  d = {
                    $key: d.$key,
                    name: d.name,
                    type: d.type
                  };
                  this._append_tag(dsk, oln, trk, 'e', null, atrs, `unhandled token: ${rpr(d)}`);
              }
            }
            results.push((function() {
              var j, ref2, results1;
              results1 = [];
              for (_ = j = 1, ref2 = wslc + 1; (1 <= ref2 ? j <= ref2 : j >= ref2); _ = 1 <= ref2 ? ++j : --j) {
                results1.push(this._append_tag(dsk, oln, trk, 'b', null, null, '\n'));
              }
              return results1;
            }).call(this));
          }
          return results;
        });
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