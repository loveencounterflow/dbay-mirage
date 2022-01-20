(function() {
  'use strict';
  var CND, GUY, Html, ITXH, PATH, SQL, URL, badge, debug, echo, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-MIRAGE';

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

  SQL = String.raw;

  GUY = require('guy');

  ({
    HTMLISH: ITXH
  } = require('intertext'));

  URL = require('url');

  ({Html} = require('./html'));

  //===========================================================================================================
  types.declare('constructor_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "( @isa.object x.db ) or ( @isa.function x.db ": function(x) {
        return (this.isa.object(x.db)) || (this.isa.function(x.db));
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_refresh_datasource_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      },
      "@isa.boolean x.force": function(x) {
        return this.isa.boolean(x.force);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_append_to_loc_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      },
      "@isa.text x.text": function(x) {
        return this.isa.text(x.text);
      },
      "@isa.boolean x.nl": function(x) {
        return this.isa.boolean(x.nl);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_walk_line_rows_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_walk_par_rows_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_set_active_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      },
      "@isa_optional.integer x.oln": function(x) {
        return this.isa_optional.integer(x.oln);
      },
      "@isa_optional.integer x.trk": function(x) {
        return this.isa_optional.integer(x.trk);
      },
      "@isa_optional.integer x.pce": function(x) {
        return this.isa_optional.integer(x.pce);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_register_dsk_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa_optional.mrg_fspath_for_url x.path": function(x) {
        return this.isa_optional.mrg_fspath_for_url(x.path);
      },
      "@isa_optional.mrg_url_for_dsk x.url": function(x) {
        return this.isa_optional.mrg_url_for_dsk(x.url);
      },
      "exactly 1 of x.path, x.url must be set": function(x) {
        return ((x.path != null) || (x.url != null)) && !((x.path != null) && (x.url != null));
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_append_text_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      },
      "@isa.positive_integer x.trk": function(x) {
        return this.isa.positive_integer(x.trk);
      },
      "@isa.text x.text": function(x) {
        return this.isa.text(x.text);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_fspath_for_url', {
    tests: {
      "@isa.text x": function(x) {
        return this.isa.text(x);
      },
      "x.startsWith '/'": function(x) {
        return x.startsWith('/');
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_url_for_dsk', {
    tests: {
      "@isa.text x": function(x) {
        return this.isa.text(x);
      },
      "( /^(file:\/\/\/)|(live:)/ ).test x": function(x) {
        return /^(file:\/\/\/|live:)/.test(x);
      }
    }
  });

  //===========================================================================================================
  this.Mrg = (function() {
    class Mrg {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var db;
        this.cfg = {...this.constructor.C.defaults.constructor_cfg, ...cfg};
        GUY.props.hide(this, 'types', types);
        this.types.validate.constructor_cfg(this.cfg);
        ({db} = GUY.obj.pluck_with_fallback(this.cfg, null, 'db'));
        GUY.props.hide(this, 'db', db);
        this.cfg = GUY.lft.freeze(this.cfg);
        this.db.create_stdlib();
        if (typeof this._set_variables === "function") {
          this._set_variables();
        }
        if (typeof this._create_sql_functions === "function") {
          this._create_sql_functions();
        }
        if (typeof this._compile_sql === "function") {
          this._compile_sql();
        }
        if (typeof this._procure_infrastructure === "function") {
          this._procure_infrastructure();
        }
        GUY.props.hide(this, 'html', new Html({
          mrg: this,
          prefix: this.cfg.prefix
        }));
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _set_variables() {
        return this.db.setv('allow_change_on_mirror', 0);
      }

      //---------------------------------------------------------------------------------------------------------
      _create_sql_functions() {
        var prefix;
        ({prefix} = this.cfg);
        //-------------------------------------------------------------------------------------------------------
        this.db.create_function({
          name: prefix + '_re_is_blank',
          deterministic: true,
          varargs: false,
          call: function(txt) {
            if (/^\s*$/.test(txt)) {
              return 1;
            } else {
              return 0;
            }
          }
        });
        //-------------------------------------------------------------------------------------------------------
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _procure_infrastructure() {
        /* TAINT skip if tables found */
        var prefix;
        ({prefix} = this.cfg);
        this.db.set_foreign_keys_state(false);
        this.db(SQL`drop view   if exists ${prefix}_rwnmirror;
drop view   if exists ${prefix}_parlnrs0;
drop view   if exists ${prefix}_parlnrs;
drop view   if exists ${prefix}_pars0;
drop view   if exists ${prefix}_pars;
-- drop view   if exists ${prefix}_lines;
-- drop view   if exists ${prefix}_location_from_dsk_locid;
-- drop view   if exists ${prefix}_prv_nxt_xtra_from_dsk_locid;
drop view   if exists ${prefix}_parmirror;
drop view   if exists ${prefix}_next_free_oln;
-- drop table  if exists ${prefix}_locs;
drop table  if exists ${prefix}_raw_mirror;
drop table  if exists ${prefix}_mirror;
drop table  if exists ${prefix}_datasources;`);
        this.db.set_foreign_keys_state(true);
        //-------------------------------------------------------------------------------------------------------
        // TABLES
        //.......................................................................................................
        this.db(SQL`create table ${prefix}_datasources (
    dsk     text not null,
    path    text,
    url     text,
    digest  text default null,
  primary key ( dsk ) );`);
        //.......................................................................................................
        /* TAINT need to indicate column nr for fine-grained source locations */
        this.db(SQL`-- * mirrors actual file contents and records computed changes
-- * is format-agnostic
create table ${prefix}_mirror (
    dsk     text    not null,                         -- data source key
    oln     integer not null,                         -- original line nr (1-based)
    trk     integer not null default 1,               -- track number
    pce     integer not null default 1,               -- piece number
    act     boolean not null default 1,               -- true: active, false: deleted
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, oln, trk, pce )
  check ( trk > 0 and floor( trk ) = trk )
  check ( act in ( 0, 1 ) ) );`);
        //.......................................................................................................
        this.db(SQL`create table ${prefix}_raw_mirror (
    dsk     text    not null,
    oln     integer not null,
    trk     integer not null default 1,
    pce     integer not null default 1,
    mat     boolean not null generated always as (
      not ${prefix}_re_is_blank( txt ) ) virtual,     -- material, i.e. non-blank
    txt     text    not null,
  primary key ( dsk, oln, trk, pce ),
  foreign key ( dsk, oln, trk, pce ) references ${prefix}_mirror
  check ( mat in ( 0, 1 ) ) );`);
        //.......................................................................................................
        this.db(SQL`-- Same as \`mrg_mirror\`, but with row numbers *for active rows*
create view ${prefix}_rwnmirror as select
    row_number() over w as rwn,
    *
  from ${prefix}_mirror
  where act
  window w as ( order by dsk, oln, trk, pce )
  order by dsk, oln, trk, pce;`);
        //.......................................................................................................
        this.db(SQL`-- Same as \`mrg_rwnmirror\` but only active, material lines (i.e. no lines that are deactivated
-- and/or blank), with PARagraph numbers added (for the technique ised here see [Gaps &
-- Islands](https://github.com/loveencounterflow/gaps-and-islands#the-gaps-and-islands-pattern).
create view ${prefix}_parlnrs0 as select distinct
    r1.rwn - ( dense_rank() over w ) + 1 as par,
    r1.*,
    r2.mat,
    r2.txt
  from ${prefix}_rwnmirror  as r1
  join ${prefix}_raw_mirror as r2
  where r1.act and r2.mat
  window w as ( partition by r1.dsk order by r1.rwn )
  order by r1.rwn;`);
        //.......................................................................................................
        this.db(SQL`-- First (\`rwn1\`) and last (\`rwn2\`) RoW Number of each (WS-delimited) \`par\`agraph.
create view ${prefix}_parlnrs as select
    dsk         as dsk,
    par         as par,
    min( rwn )  as rwn1,
    max( rwn )  as rwn2
  from ${prefix}_parlnrs0
  group by par
  order by rwn1;`);
        //.......................................................................................................
        this.db(SQL`-- Same as \`mrg_mirror\` but with PARagraph numbers added.
create view ${prefix}_parmirror as select
    m.dsk                                                 as dsk,
    m.oln                                                 as oln,
    m.trk                                                 as trk,
    m.pce                                                 as pce,
    m.act                                                 as act,
    r.mat                                                 as mat,
    ( select
          p.par as par
        from ${prefix}_parlnrs as p
        where m.rwn between p.rwn1 and p.rwn2 limit 1 )   as par,
    r.txt                                                 as txt
  from ${prefix}_rwnmirror  as m
  join ${prefix}_raw_mirror as r using ( oln, trk, pce )
  order by rwn;`);
        // #.......................................................................................................
        // @db SQL"""
        //   -- needs variables 'dsk'
        //   create view #{prefix}_lines as select distinct
        //       r1.dsk                                              as dsk,
        //       r1.rwn                                              as rwn,
        //       r1.oln                                              as oln,
        //       r1.par                                              as par,
        //       coalesce( group_concat( r1.txt, '' ) over w, '' )   as txt
        //     from #{prefix}_parmirror as r1
        //     where true
        //       and ( r1.dsk = std_getv( 'dsk' ) )
        //       and ( r1.act )
        //     window w as (
        //       partition by r1.oln
        //       order by r1.oln, r1.trk, r1.pce
        //       range between unbounded preceding and unbounded following );"""
        //.......................................................................................................
        this.db(SQL`-- needs variables 'dsk'
create view ${prefix}_pars0 as select distinct
    r1.dsk                                                                    as dsk,
    r2.rwn1                                                                   as rwn1,
    r2.rwn2                                                                   as rwn2,
    r1.par                                                                    as par,
    coalesce( group_concat( r1.txt, char( 10 ) ) over w, '' ) || char( 10 )   as txt
  from ${prefix}_parmirror  as r1
  join ${prefix}_parlnrs    as r2 using ( dsk, par )
  -- join ${prefix}_raw_mirror as r3 using ( oln, trk, pce )
  where true
    and ( r1.dsk = std_getv( 'dsk' ) )
    and ( r1.act )
  window w as (
    partition by r1.par
    order by r1.oln, r1.trk, r1.pce
    range between unbounded preceding and unbounded following );`);
        //.......................................................................................................
        this.db(SQL`-- needs variables 'dsk'
create view ${prefix}_pars as select
    p.dsk     as dsk,
    r1.oln    as oln,
    r1.trk    as trk,
    r1.pce    as pce,
    r2.oln    as oln2,
    p.rwn1    as rwn1,
    p.rwn2    as rwn2,
    p.par     as par,
    p.txt     as txt
  from ${prefix}_pars0      as p
  join ${prefix}_parlnrs0   as r1 on ( r1.rwn = p.rwn1 )
  join ${prefix}_parlnrs0   as r2 on ( r2.rwn = p.rwn2 )
  order by p.dsk, p.rwn1;`);
        //.......................................................................................................
        this.db(SQL`create view ${prefix}_next_free_oln as select
    coalesce( max( oln ), 0 ) + 1 as oln
  from ${prefix}_mirror
  where true
    and ( dsk = std_getv( 'dsk' ) )
    and ( trk = std_getv( 'trk' ) )
  limit 1;`);
        // #-------------------------------------------------------------------------------------------------------
        // TRIGGERS
        //.......................................................................................................
        this.db(SQL`create trigger ${prefix}_before_delete_on_mirror before delete on ${prefix}_mirror
  begin
    select case when old.trk = 1 and not std_getv( 'allow_change_on_mirror' ) then
    raise( fail, '^mirage@1^ not allowed to modify table ${prefix}_mirror for trk = 1' ) end;
    end;`);
        this.db(SQL`create trigger ${prefix}_before_insert_on_mirror before insert on ${prefix}_mirror
  begin
    select case when new.trk = 1 and not std_getv( 'allow_change_on_mirror' ) then
    raise( fail, '^mirage@2^ not allowed to modify table ${prefix}_mirror for trk = 1' ) end;
    end;`);
        this.db(SQL`create trigger ${prefix}_before_update_on_mirror before update on ${prefix}_mirror
  begin
    select case when old.trk = 1 and not std_getv( 'allow_change_on_mirror' ) then
    raise( fail, '^mirage@3^ not allowed to modify table ${prefix}_mirror for trk = 1' ) end;
    end;`);
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_sql() {
        var prefix;
        ({prefix} = this.cfg);
        //.......................................................................................................
        GUY.props.hide(this, 'sql', {
          //.....................................................................................................
          get_db_object_count: SQL`select count(*) as count from sqlite_schema where starts_with( $name, $prefix || '_' );`,
          //.....................................................................................................
          ds_entry_from_dsk: SQL`select * from ${prefix}_datasources where dsk = $dsk;`,
          //.....................................................................................................
          update_digest: SQL`update ${prefix}_datasources set digest = $digest where dsk = $dsk;`,
          //.....................................................................................................
          delete_raw_mirror_dsk: SQL`delete from ${prefix}_raw_mirror where dsk = $dsk;`,
          //.....................................................................................................
          delete_mirror_dsk: SQL`delete from ${prefix}_mirror where dsk = $dsk;`,
          //.....................................................................................................
          upsert_datasource: this.db.create_insert({
            into: prefix + '_datasources',
            fields: ['dsk', 'path', 'url'],
            on_conflict: {
              update: true
            }
          }),
          //.....................................................................................................
          insert_line_into_mirror: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'oln']
          }),
          //.....................................................................................................
          insert_line_into_raw_mirror: this.db.create_insert({
            into: prefix + '_raw_mirror',
            fields: ['dsk', 'oln', 'txt']
          }),
          //.....................................................................................................
          insert_trk_line: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'oln', 'trk', 'pce']
          }),
          //.....................................................................................................
          append_line_to_mirror: SQL`insert into ${prefix}_mirror ( dsk, oln, trk )
  values ( $dsk, ( select oln from ${prefix}_next_free_oln ), $trk )
  returning *;`,
          //.....................................................................................................
          append_text_to_raw_mirror: SQL`insert into ${prefix}_raw_mirror ( dsk, oln, trk, txt )
  values ( $dsk, $oln, $trk, $text )
  returning *;`
        });
        // #.....................................................................................................
        // insert_lnpart: @db.create_insert {
        //   into:       prefix + '_mirror',
        //   fields:     [ 'dsk', 'oln', 'trk', 'pce', 'txt', ], }
        // #.....................................................................................................
        // insert_xtra: @db.create_insert {
        //   into:       prefix + '_mirror',
        //   fields:     [ 'dsk', 'oln', 'pce', 'xtra', 'txt', ],
        //   returning:  '*', }
        // #.....................................................................................................
        // insert_xtra_using_dsk_locid: SQL"""
        //   -- needs variables 'dsk', 'locid'
        //   -- unfortunately, got to repeat the `std_assert()` call here
        //   insert into #{prefix}_mirror ( dsk, oln, pce, xtra, txt )
        //     select
        //         $dsk                                                    as dsk,
        //         std_assert(
        //           oln,
        //           '^insert_xtra_using_dsk_locid@546^' ||
        //           ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as oln,
        //         pce                                                     as pce,
        //         nxt_xtra                                                as nxt_xtra,
        //         $txt                                                    as txt
        //       from #{prefix}_prv_nxt_xtra_from_dsk_locid
        //     returning *;"""
        // #.....................................................................................................
        // insert_locid: @db.create_insert {
        //   into:       prefix + '_locs',
        //   fields:     [ 'dsk', 'oln', 'pce', 'props', 'del', ], }
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      register_dsk(cfg) {
        validate.mrg_register_dsk_cfg(cfg);
        if (cfg.path != null) {
          cfg.url = this._url_from_path(cfg.path);
        } else if (this.types.isa.mrg_file_url(cfg.url)) {
          cfg.path = this._path_from_url(cfg.url);
        } else {
          cfg.path = null;
        }
        this.db(this.sql.upsert_datasource, cfg);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      allowing_change_on_mirror(f) {
        var allow_change_on_mirror;
        validate.function(f);
        allow_change_on_mirror = this.db.getv('allow_change_on_mirror');
        this.db.setv('allow_change_on_mirror', 1);
        try {
          return f();
        } finally {
          this.db.setv('allow_change_on_mirror', allow_change_on_mirror);
        }
      }

      //---------------------------------------------------------------------------------------------------------
      append_text(cfg) {
        var R, dsk, lines, prefix, text, trk;
        validate.mrg_append_text_cfg((cfg = {...this.constructor.C.defaults.mrg_append_text_cfg, ...cfg}));
        ({dsk, trk, text} = cfg);
        ({prefix} = this.cfg);
        lines = text.split('\n');
        R = [];
        this.db.setv('dsk', dsk);
        this.db.setv('trk', trk);
        this.allowing_change_on_mirror(() => {
          var d, i, len, line;
          for (i = 0, len = lines.length; i < len; i++) {
            line = lines[i];
            d = this.db.first_row(this.sql.append_line_to_mirror, {dsk, trk});
            debug('^32243^', d);
            R.push(this.db.first_row(this.sql.append_text_to_raw_mirror, {
              dsk,
              oln: d.oln,
              trk,
              text: line
            }));
          }
          return null;
        });
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _ds_entry_from_dsk(dsk) {
        return this.db.single_row(this.sql.ds_entry_from_dsk, {dsk});
      }

      _update_digest(dsk, digest) {
        return this.db(this.sql.update_digest, {dsk, digest});
      }

      //-----------------------------------------------------------------------------------------------------------
      _delete_lines(dsk) {
        this.db(this.sql.delete_raw_mirror_dsk, {dsk});
        this.db(this.sql.delete_mirror_dsk, {dsk});
        return null;
      }

      //-----------------------------------------------------------------------------------------------------------
      _url_from_path(path) {
        return (URL.pathToFileURL(path)).href;
      }

      _path_from_url(url) {
        return URL.fileURLToPath(url);
      }

      //---------------------------------------------------------------------------------------------------------
      refresh_datasource(cfg) {
        var R;
        this.db.setv('allow_change_on_mirror', 1);
        try {
          R = this._refresh_datasource(cfg);
        } finally {
          this.db.setv('allow_change_on_mirror', 0);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _refresh_datasource(cfg) {
        var counts, current_digest, digest, dsk, force, path, prefix, url;
        validate.mrg_refresh_datasource_cfg((cfg = {...this.constructor.C.defaults.mrg_refresh_datasource_cfg, ...cfg}));
        ({dsk, force} = cfg);
        ({prefix} = this.cfg);
        ({path, url, digest} = this._ds_entry_from_dsk(dsk));
        if (path == null) {
          throw new Error(`^Mirage/refresh_datasource@1^ unable to refresh datasource ${rpr(dsk)} (URL: ${rpr(url)})`);
        }
        current_digest = GUY.fs.get_content_hash(path);
        counts = {
          files: 0,
          bytes: 0
        };
        //.......................................................................................................
        if (force || (digest !== current_digest)) {
          //.....................................................................................................
          this.db(() => {
            var insert_line_into_mirror, insert_line_into_raw_mirror, line, oln, ref, txt;
            this._delete_lines(dsk);
            insert_line_into_mirror = this.db.prepare(this.sql.insert_line_into_mirror);
            insert_line_into_raw_mirror = this.db.prepare(this.sql.insert_line_into_raw_mirror);
            oln = 0;
            ref = GUY.fs.walk_lines(path, {
              decode: false
            });
            //...................................................................................................
            for (line of ref) {
              oln++;
              counts.bytes += line.length;
              txt = line.toString('utf-8');
              /* TAINT reduce to single statement */
              insert_line_into_mirror.run({dsk, oln});
              insert_line_into_raw_mirror.run({dsk, oln, txt});
            }
            //...................................................................................................
            counts.files++;
            this._update_digest(dsk, current_digest);
            return null;
          });
        }
        //.......................................................................................................
        return counts;
      }

      //=========================================================================================================
      // CONTENT RETRIEVAL
      //---------------------------------------------------------------------------------------------------------
      get_text(cfg) {
        var d;
        return ((function() {
          var ref, results;
          ref = this.walk_line_rows(cfg);
          results = [];
          for (d of ref) {
            results.push(d.line);
          }
          return results;
        }).call(this)).join('\n');
      }

      get_line_rows(cfg) {
        return [...(this.walk_line_rows(cfg))];
      }

      get_par_rows(cfg) {
        return [...(this.walk_par_rows(cfg))];
      }

      // #---------------------------------------------------------------------------------------------------------
      // walk_line_rows: ( cfg ) ->
      //   validate.mrg_walk_line_rows_cfg ( cfg = { @constructor.C.defaults.mrg_walk_line_rows_cfg..., cfg..., } )
      //   { dsk       } = cfg
      //   { prefix    } = @cfg
      //   @db.setv 'dsk', dsk
      //   return @db SQL"select * from #{prefix}_lines;"

        //---------------------------------------------------------------------------------------------------------
      walk_par_rows(cfg) {
        var dsk, prefix;
        validate.mrg_walk_par_rows_cfg((cfg = {...this.constructor.C.defaults.mrg_walk_par_rows_cfg, ...cfg}));
        ({dsk} = cfg);
        ({prefix} = this.cfg);
        this.db.setv('dsk', dsk);
        return this.db(SQL`select * from ${prefix}_pars;`);
      }

      //---------------------------------------------------------------------------------------------------------
      activate(cfg) {
        return this._set_active({
          ...cfg,
          act: true
        });
      }

      deactivate(cfg) {
        return this._set_active({
          ...cfg,
          act: false
        });
      }

      //---------------------------------------------------------------------------------------------------------
      _set_active(cfg) {
        var act, dsk, oln, pce, sql, trk;
        validate.mrg_set_active_cfg((cfg = {...this.constructor.C.defaults.mrg_set_active_cfg, ...cfg}));
        ({dsk, oln, trk, pce, act} = cfg);
        act = act ? 1 : 0;
        sql = SQL`update mrg_mirror set act = $act where ( dsk = $dsk )`;
        if (oln != null) {
          sql += SQL` and ( oln = $oln )`;
        }
        if (trk != null) {
          sql += SQL` and ( trk = $trk )`;
        }
        if (pce != null) {
          sql += SQL` and ( pce = $pce )`;
        }
        sql += SQL`;`;
        (this.db.prepare(sql)).run({dsk, oln, trk, pce, act});
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Mrg.C = GUY.lft.freeze({
      defaults: {
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'mrg'
        },
        //.....................................................................................................
        mrg_refresh_datasource_cfg: {
          dsk: null,
          force: false
        },
        //.....................................................................................................
        mrg_append_to_loc_cfg: {
          dsk: null,
          text: null,
          nl: true
        },
        //.....................................................................................................
        mrg_walk_line_rows_cfg: {
          dsk: null
        },
        //.....................................................................................................
        mrg_walk_par_rows_cfg: {
          dsk: null
        },
        //.....................................................................................................
        mrg_register_dsk_cfg: {
          dsk: null,
          path: null,
          url: null
        },
        //.....................................................................................................
        mrg_set_active_cfg: {
          dsk: null,
          oln: null,
          trk: null,
          pce: null
        },
        //.....................................................................................................
        mrg_append_text_cfg: {
          dsk: null,
          trk: 1,
          txt: null
        }
      }
    });

    return Mrg;

  }).call(this);

  //=========================================================================================================
// CONTENT MANIPULATION
//---------------------------------------------------------------------------------------------------------
// append_to_loc: ( cfg ) ->
// validate.mrg_append_to_loc_cfg ( cfg = { @constructor.C.defaults.mrg_append_to_loc_cfg..., cfg..., } )

}).call(this);

//# sourceMappingURL=main.js.map