(function() {
  'use strict';
  var CND, GUY, ITXH, PATH, SQL, badge, debug, echo, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

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
      "@isa_optional.integer x.lnr": function(x) {
        return this.isa_optional.integer(x.lnr);
      },
      "@isa_optional.integer x.trk": function(x) {
        return this.isa_optional.integer(x.trk);
      },
      "@isa_optional.integer x.pce": function(x) {
        return this.isa_optional.integer(x.pce);
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
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _set_variables() {}

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
        this.db(SQL`drop view   if exists ${prefix}_paragraph_linenumbers;
drop view   if exists ${prefix}_lines;
drop view   if exists ${prefix}_location_from_dsk_locid;
drop view   if exists ${prefix}_prv_nxt_xtra_from_dsk_locid;
drop table  if exists ${prefix}_locs;
drop table  if exists ${prefix}_mirror;
drop table  if exists ${prefix}_datasources;`);
        //-------------------------------------------------------------------------------------------------------
        // TABLES
        //.......................................................................................................
        this.db(SQL`create table ${prefix}_datasources (
    dsk     text not null,
    path    text not null,
    digest  text default null,
  primary key ( dsk ) );`);
        //.......................................................................................................
        /* TAINT need to indicate column nr for fine-grained source locations */
        this.db(SQL`create table ${prefix}_mirror (
    dsk     text    not null,           -- data source key
    lnr     integer not null,           -- line nr (1-based)
    trk     integer not null default 1, -- track number
    pce     integer not null default 1, -- piece number
    act     boolean not null default 1, -- true: active, false: deleted
    blk     boolean not null generated always as ( ${prefix}_re_is_blank( txt ) ) virtual,
    txt     text    not null,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, lnr, trk, pce ) );`);
        //.......................................................................................................
        this.db(SQL`-- thx to https://github.com/loveencounterflow/gaps-and-islands#the-gaps-and-islands-pattern
create view ${prefix}_paragraph_linenumbers as with t as ( select
    dsk                                 as dsk,
    lnr - ( dense_rank() over w ) + 1   as par,
    lnr                                 as lnr
  from ${prefix}_mirror
  where not blk
  window w as (
    partition by dsk
    order by lnr ) )
select
    dsk         as dsk,
    par         as par,
    min( lnr )  as lnr1,
    max( lnr )  as lnr2
  from   t
  group by par
  order by lnr1;`);
        //.......................................................................................................
        this.db(SQL`create view ${prefix}_parmirror as select
    dsk                                                   as dsk,
    lnr                                                   as lnr,
    trk                                                   as trk,
    pce                                                   as pce,
    act                                                   as act,
    -- blk                                                   as blk,
    ( select
          p.par as par
        from ${prefix}_paragraph_linenumbers as p
        where m.lnr between p.lnr1 and p.lnr2 limit 1 )   as par,
    txt                                                   as txt
  from ${prefix}_mirror as m
  -- where not blk
  order by dsk, lnr, trk, pce;`);
        // #.......................................................................................................
        // @db SQL"""
        //   create table #{prefix}_refs (
        //       dsk     text    not null,           -- data source key
        //       lnr     integer not null,           -- line nr (1-based)
        //       trk     integer not null default 1, -- track number
        //       pce     integer not null default 1, -- piece number

        //       sdsk     text    not null,           -- data source key
        //       slnr     integer not null,           -- line nr (1-based)
        //       strk     integer not null default 1, -- track number
        //       spce     integer not null default 1, -- piece number

        //     foreign key ( dsk ) references #{prefix}_datasources,
        //     primary key ( dsk, lnr, trk, pce ) );"""
        //-------------------------------------------------------------------------------------------------------
        // VIEWS
        //.......................................................................................................
        // @db SQL"""
        //   -- needs variables 'dsk', 'locid'
        //   create view #{prefix}_prv_nxt_xtra_from_dsk_locid as
        //     with r2 as ( select
        //         lnr,
        //         pce,
        //         props,
        //         del
        //       from #{prefix}_location_from_dsk_locid )
        //     select
        //       std_assert(
        //         r1.dsk,
        //         '^#{prefix}_location_from_dsk_locid@546^' ||
        //         ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as dsk,
        //       std_getv( 'locid' )                                     as locid,
        //       r1.lnr                                                  as lnr,
        //       r1.pce                                               as pce,
        //       r2.props                                                as props,
        //       r2.del                                                  as del,
        //       min( r1.trk ) - 1                                      as prv_xtra,
        //       max( r1.trk ) + 1                                      as nxt_xtra
        //     from
        //       #{prefix}_mirror as r1, r2
        //     where true
        //       and ( r1.dsk     = std_getv( 'dsk' ) )
        //       and ( r1.lnr     = r2.lnr            )
        //       and ( r1.pce  = r2.pce         )
        //     limit 1;"""
        //.......................................................................................................
        this.db(SQL`-- needs variables 'dsk'
create view ${prefix}_lines as select distinct
    r1.dsk                                              as dsk,
    r1.lnr                                              as lnr,
    r1.par                                              as par,
    coalesce( group_concat( r1.txt, '' ) over w, '' )   as txt
  from ${prefix}_parmirror as r1
  where true
    and ( r1.dsk = std_getv( 'dsk' ) )
    and ( r1.act )
  window w as (
    partition by r1.lnr
    order by r1.lnr, r1.trk, r1.pce
    range between unbounded preceding and unbounded following );`);
        //.......................................................................................................
        this.db(SQL`-- needs variables 'dsk'
create view ${prefix}_pars as select distinct
    r1.dsk                                                as dsk,
    r2.lnr1                                               as lnr1,
    r2.lnr2                                               as lnr2,
    r1.par                                                as par,
    coalesce( group_concat( r1.txt, '\n' ) over w, '' )   as txt
  from ${prefix}_parmirror as r1
  join ${prefix}_paragraph_linenumbers as r2 using ( dsk, par )
  where true
    and ( r1.dsk = std_getv( 'dsk' ) )
    and ( r1.act )
  window w as (
    partition by r1.par
    order by r1.lnr, r1.trk, r1.pce
    range between unbounded preceding and unbounded following );`);
        //-------------------------------------------------------------------------------------------------------
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
          delete_lines: SQL`delete from ${prefix}_mirror where dsk = $dsk;`,
          //.....................................................................................................
          upsert_datasource: this.db.create_insert({
            into: prefix + '_datasources',
            fields: ['dsk', 'path'],
            on_conflict: {
              update: true
            }
          }),
          //.....................................................................................................
          insert_line: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'txt']
          }),
          //.....................................................................................................
          insert_lnpart: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'trk', 'pce', 'txt']
          }),
          //.....................................................................................................
          insert_xtra: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'pce', 'xtra', 'txt'],
            returning: '*'
          }),
          //.....................................................................................................
          insert_xtra_using_dsk_locid: SQL`-- needs variables 'dsk', 'locid'
-- unfortunately, got to repeat the \`std_assert()\` call here
insert into ${prefix}_mirror ( dsk, lnr, pce, xtra, txt )
  select
      $dsk                                                    as dsk,
      std_assert(
        lnr,
        '^insert_xtra_using_dsk_locid@546^' ||
        ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as lnr,
      pce                                                     as pce,
      nxt_xtra                                                as nxt_xtra,
      $txt                                                    as txt
    from ${prefix}_prv_nxt_xtra_from_dsk_locid
  returning *;`,
          //.....................................................................................................
          insert_locid: this.db.create_insert({
            into: prefix + '_locs',
            fields: ['dsk', 'lnr', 'pce', 'props', 'del']
          })
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      register_dsk(cfg) {
        this.db(this.sql.upsert_datasource, cfg);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _ds_entry_from_dsk(dsk) {
        return this.db.single_row(this.sql.ds_entry_from_dsk, {dsk});
      }

      _update_digest(dsk, digest) {
        return this.db(this.sql.update_digest, {dsk, digest});
      }

      _delete_lines(dsk) {
        return this.db(this.sql.delete_lines, {dsk});
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
        var counts, current_digest, digest, dsk, force, path, prefix;
        validate.mrg_refresh_datasource_cfg((cfg = {...this.constructor.C.defaults.mrg_refresh_datasource_cfg, ...cfg}));
        ({dsk, force} = cfg);
        ({prefix} = this.cfg);
        ({path, digest} = this._ds_entry_from_dsk(dsk));
        current_digest = GUY.fs.get_content_hash(path);
        counts = {
          files: 0,
          bytes: 0
        };
        //.......................................................................................................
        if (force || (digest !== current_digest)) {
          //.....................................................................................................
          this.db(() => {
            var insert_line, line, lnr, ref, txt;
            this._delete_lines(dsk);
            insert_line = this.db.prepare(this.sql.insert_line);
            lnr = 0;
            ref = GUY.fs.walk_lines(path, {
              decode: false
            });
            //...................................................................................................
            for (line of ref) {
              lnr++;
              counts.bytes += line.length;
              txt = line.toString('utf-8');
              insert_line.run({dsk, lnr, txt});
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

      //---------------------------------------------------------------------------------------------------------
      walk_line_rows(cfg) {
        var dsk, prefix;
        validate.mrg_walk_line_rows_cfg((cfg = {...this.constructor.C.defaults.mrg_walk_line_rows_cfg, ...cfg}));
        ({dsk} = cfg);
        ({prefix} = this.cfg);
        this.db.setv('dsk', dsk);
        return this.db(SQL`select * from ${prefix}_lines;`);
      }

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
        var act, dsk, lnr, pce, sql, trk;
        validate.mrg_set_active_cfg((cfg = {...this.constructor.C.defaults.mrg_set_active_cfg, ...cfg}));
        ({dsk, lnr, trk, pce, act} = cfg);
        act = act ? 1 : 0;
        sql = SQL`update mrg_mirror set act = $act where ( dsk = $dsk )`;
        if (lnr != null) {
          sql += SQL` and ( lnr = $lnr )`;
        }
        if (trk != null) {
          sql += SQL` and ( trk = $trk )`;
        }
        if (pce != null) {
          sql += SQL` and ( pce = $pce )`;
        }
        sql += SQL`;`;
        debug('^33490^', rpr(sql));
        (this.db.prepare(sql)).run({dsk, lnr, trk, pce, act});
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
        mrg_set_active_cfg: {
          dsk: null,
          lnr: null,
          trk: null,
          pce: null
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

//# sourceMappingURL=main2.js.map