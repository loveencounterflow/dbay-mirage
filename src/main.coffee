
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-MIRAGE'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
types                     = new ( require 'intertype' ).Intertype()
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
GUY                       = require 'guy'
{ HTMLISH: ITXH }         = require 'intertext'
URL                       = require 'url'
{ Html }                  = require './html'
{ SQL }                   = GUY.str


#===========================================================================================================
types.declare 'constructor_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "( @isa.object x.db ) or ( @isa.function x.db ":  ( x ) -> ( @isa.object x.db ) or ( @isa.function x.db )

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_refresh_datasource_cfg', tests:
  "@isa.object x":                ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk
  "@isa.boolean x.force":         ( x ) -> @isa.boolean x.force

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_append_to_loc_cfg', tests:
  "@isa.object x":                ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk
  "@isa.text x.text":             ( x ) -> @isa.text x.text
  "@isa.boolean x.nl":            ( x ) -> @isa.boolean x.nl

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_walk_line_rows_cfg', tests:
  "@isa.object x":                      ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":           ( x ) -> @isa.nonempty_text x.dsk

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_walk_par_rows_cfg', tests:
  "@isa.object x":                      ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":           ( x ) -> @isa.nonempty_text x.dsk

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_set_active_cfg', tests:
  "@isa.object x":                      ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":           ( x ) -> @isa.nonempty_text x.dsk
  "@isa_optional.integer x.oln":        ( x ) -> @isa_optional.integer x.oln
  "@isa_optional.integer x.trk":        ( x ) -> @isa_optional.integer x.trk
  "@isa_optional.integer x.pce":        ( x ) -> @isa_optional.integer x.pce

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_register_dsk_cfg', tests:
  "@isa.object x":                            ( x ) -> @isa.object x
  "@isa_optional.mrg_fspath_for_url x.path":  ( x ) -> @isa_optional.mrg_fspath_for_url x.path
  "@isa_optional.mrg_url_for_dsk x.url":      ( x ) -> @isa_optional.mrg_url_for_dsk x.url
  "exactly 1 of x.path, x.url must be set":   ( x ) -> ( x.path? or x.url? ) and not ( x.path? and x.url? )

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_append_text_cfg', tests:
  "@isa.object x":                            ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":                 ( x ) -> @isa.nonempty_text x.dsk
  "@isa.positive_integer x.trk":              ( x ) -> @isa.positive_integer x.trk
  "@isa.text x.text":                         ( x ) -> @isa.text x.text

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_fspath_for_url', tests:
  "@isa.text x":          ( x ) -> @isa.text x
  "x.startsWith '/'":     ( x ) -> x.startsWith '/'

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_url_for_dsk', tests:
  "@isa.text x":                          ( x ) -> @isa.text x
  "( /^(file:\/\/\/)|(live:)/ ).test x":  ( x ) -> ( /^(file:\/\/\/|live:)/ ).test x



#===========================================================================================================
class @Mrg

  #---------------------------------------------------------------------------------------------------------
  @C: GUY.lft.freeze
    ### NOTE may become configurable per instance, per datasource ###
    trim_line_ends: true
    defaults:
      #.....................................................................................................
      constructor_cfg:
        db:               null
        prefix:           'mrg'
      #.....................................................................................................
      mrg_refresh_datasource_cfg:
        dsk:              null
        force:            false
      #.....................................................................................................
      mrg_append_to_loc_cfg:
        dsk:              null
        text:             null
        nl:               true
      #.....................................................................................................
      mrg_walk_line_rows_cfg:
        dsk:              null
      #.....................................................................................................
      mrg_walk_par_rows_cfg:
        dsk:              null
      #.....................................................................................................
      mrg_register_dsk_cfg:
        dsk:              null
        path:             null
        url:              null
      #.....................................................................................................
      mrg_set_active_cfg:
        dsk:              null
        oln:              null
        trk:              null
        pce:              null
      #.....................................................................................................
      mrg_append_text_cfg:
        dsk:              null
        trk:              1
        txt:              null

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @cfg    = { @constructor.C.defaults.constructor_cfg..., cfg..., }
    GUY.props.hide @, 'types', types
    @types.validate.constructor_cfg @cfg
    { db, } = GUY.obj.pluck_with_fallback @cfg, null, 'db'
    GUY.props.hide @, 'db', db
    @cfg    = GUY.lft.freeze @cfg
    @db.create_stdlib()
    @_set_variables?()
    @_create_sql_functions?()
    @_compile_sql?()
    @_procure_infrastructure?()
    GUY.props.hide @, 'html', new Html { mrg: @, prefix: @cfg.prefix, }
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _set_variables: ->
    @db.setv 'allow_change_on_mirror', 0

  #---------------------------------------------------------------------------------------------------------
  _create_sql_functions: ->
    { prefix } = @cfg
    # #-------------------------------------------------------------------------------------------------------
    # @db.create_function
    #   name:           prefix + '_re_is_blank'
    #   deterministic:  true
    #   varargs:        false
    #   call:           ( txt ) -> if ( /^\s*$/.test txt ) then 1 else 0
    #-------------------------------------------------------------------------------------------------------
    return null

  #---------------------------------------------------------------------------------------------------------
  _procure_infrastructure: ->
    ### TAINT skip if tables found ###
    { prefix } = @cfg
    @db.set_foreign_keys_state false
    @db SQL"""
      drop view   if exists _#{prefix}_ws_linecounts;
      drop view   if exists #{prefix}_paragraphs;
      drop table  if exists #{prefix}_raw_mirror;
      drop table  if exists #{prefix}_mirror;
      drop table  if exists #{prefix}_datasources;"""
    @db.set_foreign_keys_state true
    #-------------------------------------------------------------------------------------------------------
    # TABLES
    #.......................................................................................................
    @db SQL"""
      create table #{prefix}_datasources (
          dsk     text not null,
          path    text,
          url     text,
          digest  text default null,
        primary key ( dsk ) );"""
    #.......................................................................................................
    ### TAINT need to indicate column nr for fine-grained source locations ###
    @db SQL"""
      -- * mirrors actual file contents and records computed changes
      -- * is format-agnostic
      create table #{prefix}_mirror (
          dsk     text    not null,                         -- data source key
          oln     integer not null,                         -- original line nr (1-based)
          trk     integer not null default 1,               -- track number
          pce     integer not null default 1,               -- piece number
          act     boolean not null default 1,               -- true: active, false: deleted
        foreign key ( dsk ) references #{prefix}_datasources,
        primary key ( dsk, oln, trk, pce )
        check ( trk > 0 and floor( trk ) = trk )
        check ( act in ( 0, 1 ) ) );
      create index #{prefix}_mirror_oln on #{prefix}_mirror ( oln );
      create index #{prefix}_mirror_trk on #{prefix}_mirror ( trk );
      create index #{prefix}_mirror_pce on #{prefix}_mirror ( pce );
      create index #{prefix}_mirror_act on #{prefix}_mirror ( act );"""
    #.......................................................................................................
    @db SQL"""
      create table #{prefix}_raw_mirror (
          dsk     text    not null,
          oln     integer not null,
          trk     integer not null default 1,
          pce     integer not null default 1,
          mat     boolean not null generated always as ( txt != '' ) virtual, -- material, i.e. non-blank
          par     integer not null,
          txt     text    not null,
        primary key ( dsk, oln, trk, pce ),
        foreign key ( dsk, oln, trk, pce ) references #{prefix}_mirror
        check ( mat in ( 0, 1 ) ) );
      create index #{prefix}_raw_mirror_oln on #{prefix}_raw_mirror ( oln );
      create index #{prefix}_raw_mirror_trk on #{prefix}_raw_mirror ( trk );
      create index #{prefix}_raw_mirror_pce on #{prefix}_raw_mirror ( pce );
      create index #{prefix}_raw_mirror_mat on #{prefix}_raw_mirror ( mat );
      create index #{prefix}_raw_mirror_par on #{prefix}_raw_mirror ( par );
      create index #{prefix}_raw_mirror_txt on #{prefix}_raw_mirror ( txt );"""
    #.......................................................................................................
    @db SQL"""
      create view _#{prefix}_ws_linecounts as select distinct
          raw_mirror.dsk                                as dsk,
          min( raw_mirror.oln ) over w                  as oln1,
          max( raw_mirror.oln ) over w                  as oln2,
          raw_mirror.trk                                as trk,
          raw_mirror.pce                                as pce,
          raw_mirror.par                                as par,
          count( * ) over w                             as wslc -- white space line count
        from #{prefix}_raw_mirror as raw_mirror
        join #{prefix}_mirror     as mirror using ( dsk, oln, trk, pce )
        where mirror.act and not raw_mirror.mat
        window w as (
          partition by raw_mirror.par
          order by mirror.dsk, mirror.oln, mirror.trk, mirror.pce
          range between unbounded preceding and unbounded following )
        order by mirror.dsk, mirror.oln, mirror.trk, mirror.pce;"""
    #.......................................................................................................
    @db SQL"""
      create view #{prefix}_paragraphs as select distinct
          raw_mirror.dsk                                as dsk,
          min( raw_mirror.oln ) over w                  as oln1,
          max( raw_mirror.oln ) over w                  as oln2,
          ws_linecounts.oln2                            as oln2ws,
          raw_mirror.trk                                as trk,
          raw_mirror.pce                                as pce,
          raw_mirror.par                                as par,
          ws_linecounts.wslc                            as wslc,
          group_concat( raw_mirror.txt, '\n' ) over w   as txt
        from #{prefix}_raw_mirror     as raw_mirror
        join #{prefix}_mirror         as mirror         using ( dsk, oln, trk, pce )
        join _#{prefix}_ws_linecounts as ws_linecounts  using ( dsk, trk, pce, par )
        where mirror.act and raw_mirror.mat
        window w as (
          partition by raw_mirror.par
          order by mirror.dsk, mirror.oln, mirror.trk, mirror.pce
          range between unbounded preceding and unbounded following )
        order by mirror.dsk, mirror.oln, mirror.trk, mirror.pce;"""
    # #-------------------------------------------------------------------------------------------------------
    # TRIGGERS
    #.......................................................................................................
    @db SQL"""
      create trigger #{prefix}_before_delete_on_mirror before delete on #{prefix}_mirror
        begin
          select case when old.trk = 1 and not std_getv( 'allow_change_on_mirror' ) then
          raise( fail, '^mirage@1^ not allowed to modify table #{prefix}_mirror for trk = 1' ) end;
          end;"""
    @db SQL"""
      create trigger #{prefix}_before_insert_on_mirror before insert on #{prefix}_mirror
        begin
          select case when new.trk = 1 and not std_getv( 'allow_change_on_mirror' ) then
          raise( fail, '^mirage@2^ not allowed to modify table #{prefix}_mirror for trk = 1' ) end;
          end;"""
    @db SQL"""
      create trigger #{prefix}_before_update_on_mirror before update on #{prefix}_mirror
        begin
          select case when old.trk = 1 and not std_getv( 'allow_change_on_mirror' ) then
          raise( fail, '^mirage@3^ not allowed to modify table #{prefix}_mirror for trk = 1' ) end;
          end;"""
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_sql: ->
    { prefix } = @cfg
    #.......................................................................................................
    GUY.props.hide @, 'sql',
      #.....................................................................................................
      get_db_object_count:  SQL"""
        select count(*) as count from sqlite_schema where starts_with( $name, $prefix || '_' );"""
      #.....................................................................................................
      ds_entry_from_dsk:  SQL"""
        select * from #{prefix}_datasources where dsk = $dsk;"""
      #.....................................................................................................
      update_digest: SQL"""
        update #{prefix}_datasources set digest = $digest where dsk = $dsk;"""
      #.....................................................................................................
      delete_raw_mirror_dsk: SQL"""
        delete from #{prefix}_raw_mirror where dsk = $dsk;"""
      #.....................................................................................................
      delete_mirror_dsk: SQL"""
        delete from #{prefix}_mirror where dsk = $dsk;"""
      #.....................................................................................................
      upsert_datasource: @db.create_insert {
        into:   prefix + '_datasources',
        fields: [ 'dsk', 'path', 'url', ],
        on_conflict: { update: true, }, }
      #.....................................................................................................
      insert_line_into_mirror: @db.create_insert {
        into:       prefix + '_mirror',
        fields:     [ 'dsk', 'oln', ], }
      #.....................................................................................................
      insert_line_into_raw_mirror: @db.create_insert {
        into:       prefix + '_raw_mirror',
        fields:     [ 'dsk', 'oln', 'par', 'txt', ], }
      #.....................................................................................................
      insert_trk_line: @db.create_insert {
        into:       prefix + '_mirror',
        fields:     [ 'dsk', 'oln', 'trk', 'pce', ], }
      #.....................................................................................................
      append_line_to_mirror: SQL"""
        insert into #{prefix}_mirror ( dsk, oln, trk )
          values ( $dsk, ( select oln from #{prefix}_next_free_oln ), $trk )
          returning *;"""
      next_free_oln: SQL"""select
          coalesce( max( oln ), 0 ) + 1 as oln
        from #{prefix}_mirror
        where true
          and ( dsk = $dsk )
          and ( trk = $trk )
        limit 1;"""
      #.....................................................................................................
      append_text_to_raw_mirror: SQL"""
        insert into #{prefix}_raw_mirror ( dsk, oln, trk, par, txt )
          values ( $dsk, $oln, $trk, $par, $text )
          returning *;"""
      next_free_par: SQL"""select
          coalesce( max( par ), 0 ) + 1 as par
        from #{prefix}_raw_mirror
        where true
          and ( dsk = $dsk )
          and ( trk = $trk )
        limit 1;"""
      # #.....................................................................................................
      # insert_lnpart: @db.create_insert {
      #   into:       prefix + '_mirror',
      #   fields:     [ 'dsk', 'oln', 'trk', 'pce', 'txt', ], }
      # #.....................................................................................................
      # insert_xtra: @db.create_insert {
      #   into:       prefix + '_mirror',
      #   fields:     [ 'dsk', 'oln', 'pce', 'xtra', 'txt', ],
      #   returning:  '*', }
      # #.....................................................................................................
      # insert_xtra_using_dsk_locid: SQL"""
      #   -- needs variables 'dsk', 'locid'
      #   -- unfortunately, got to repeat the `std_assert()` call here
      #   insert into #{prefix}_mirror ( dsk, oln, pce, xtra, txt )
      #     select
      #         $dsk                                                    as dsk,
      #         std_assert(
      #           oln,
      #           '^insert_xtra_using_dsk_locid@546^' ||
      #           ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as oln,
      #         pce                                                     as pce,
      #         nxt_xtra                                                as nxt_xtra,
      #         $txt                                                    as txt
      #       from #{prefix}_prv_nxt_xtra_from_dsk_locid
      #     returning *;"""
      # #.....................................................................................................
      # insert_locid: @db.create_insert {
      #   into:       prefix + '_locs',
      #   fields:     [ 'dsk', 'oln', 'pce', 'props', 'del', ], }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  register_dsk: ( cfg ) ->
    validate.mrg_register_dsk_cfg cfg
    if cfg.path?                              then  cfg.url   = @_url_from_path cfg.path
    else if @types.isa.mrg_file_url cfg.url   then  cfg.path  = @_path_from_url cfg.url
    else                                            cfg.path  = null
    @db @sql.upsert_datasource, cfg
    return null

  #---------------------------------------------------------------------------------------------------------
  allowing_change_on_mirror: ( f ) ->
    validate.function f
    allow_change_on_mirror = @db.getv 'allow_change_on_mirror'
    @db.setv 'allow_change_on_mirror', 1
    try
      return f()
    finally
      @db.setv 'allow_change_on_mirror', allow_change_on_mirror

  #---------------------------------------------------------------------------------------------------------
  append_text: ( cfg ) ->
    validate.mrg_append_text_cfg ( cfg = { @constructor.C.defaults.mrg_append_text_cfg..., cfg..., } )
    { dsk
      trk
      text    } = cfg
    { prefix  } = @cfg
    lines       = text.split '\n'
    R           = []
    @db.setv 'dsk', dsk
    @db.setv 'trk', trk
    @allowing_change_on_mirror =>
      for line in lines
        d = @db.first_row @sql.append_line_to_mirror, { dsk, trk, }
        ### TAINT get `par` from DB ###
        debug '^32243^', d
        R.push @db.first_row @sql.append_text_to_raw_mirror, \
          { dsk, oln: d.oln, trk, pce: d.pce, par, text: line, }
      return null
    return R

  #---------------------------------------------------------------------------------------------------------
  _ds_entry_from_dsk: ( dsk ) -> @db.single_row @sql.ds_entry_from_dsk, { dsk, }
  _update_digest: ( dsk, digest ) -> @db @sql.update_digest, { dsk, digest, }

  #-----------------------------------------------------------------------------------------------------------
  _delete_lines: ( dsk ) ->
    @db @sql.delete_raw_mirror_dsk, { dsk, }
    @db @sql.delete_mirror_dsk,     { dsk, }
    return null

  #-----------------------------------------------------------------------------------------------------------
  _url_from_path: ( path ) -> ( URL.pathToFileURL path ).href
  _path_from_url: ( url  ) -> URL.fileURLToPath url

  #---------------------------------------------------------------------------------------------------------
  refresh_datasource: ( cfg ) ->
    @db.setv 'allow_change_on_mirror', 1
    try
      R = @_refresh_datasource cfg
    finally
      @db.setv 'allow_change_on_mirror', 0
    return R

  #---------------------------------------------------------------------------------------------------------
  _refresh_datasource: ( cfg ) ->
    validate.mrg_refresh_datasource_cfg ( cfg = { @constructor.C.defaults.mrg_refresh_datasource_cfg..., cfg..., } )
    { dsk
      force       } = cfg
    { prefix      } = @cfg
    { path
      url
      digest      } = @_ds_entry_from_dsk dsk
    ### NOTE may become configurable per instance, per datasource ###
    trim_line_ends  = @constructor.C.trim_line_ends
    unless path?
      throw new Error "^Mirage/refresh_datasource@1^ unable to refresh datasource #{rpr dsk} (URL: #{rpr url})"
    current_digest  = GUY.fs.get_content_hash path
    counts          = { files: 0, bytes: 0, }
    #.......................................................................................................
    if force or ( digest isnt current_digest )
      #.....................................................................................................
      @db =>
        @_delete_lines dsk
        insert_line_into_mirror     = @db.prepare @sql.insert_line_into_mirror
        insert_line_into_raw_mirror = @db.prepare @sql.insert_line_into_raw_mirror
        oln                         = 0
        par                         = 0
        within_par                  = false
        #...................................................................................................
        for line from GUY.fs.walk_lines path, { decode: false, }
          oln++
          counts.bytes   += line.length
          txt             = line.toString 'utf-8'
          txt             = txt.trimEnd() if trim_line_ends
          if txt is ''
            within_par  = false
          else unless within_par
            within_par = true
            par++
          ### TAINT reduce to single statement ###
          insert_line_into_mirror.run     { dsk, oln, }
          insert_line_into_raw_mirror.run { dsk, oln, par, txt, }
        #...................................................................................................
        counts.files++
        @_update_digest dsk, current_digest
        return null
    #.......................................................................................................
    return counts

  #---------------------------------------------------------------------------------------------------------
  _get_next_free_oln: ( cfg ) -> @db.single_value @sql.next_free_oln, cfg
  _get_next_free_par: ( cfg ) -> @db.single_value @sql.next_free_par, cfg

  #=========================================================================================================
  # CONTENT RETRIEVAL
  #---------------------------------------------------------------------------------------------------------
  get_text:       ( cfg ) -> ( d.line for d from @walk_line_rows cfg ).join '\n'
  get_line_rows:  ( cfg ) -> [ ( @walk_line_rows cfg )..., ]
  get_par_rows:   ( cfg ) -> [ ( @walk_par_rows  cfg )..., ]

  # #---------------------------------------------------------------------------------------------------------
  # walk_line_rows: ( cfg ) ->
  #   validate.mrg_walk_line_rows_cfg ( cfg = { @constructor.C.defaults.mrg_walk_line_rows_cfg..., cfg..., } )
  #   { dsk       } = cfg
  #   { prefix    } = @cfg
  #   @db.setv 'dsk', dsk
  #   return @db SQL"select * from #{prefix}_lines;"

  #---------------------------------------------------------------------------------------------------------
  walk_par_rows: ( cfg ) ->
    validate.mrg_walk_par_rows_cfg ( cfg = { @constructor.C.defaults.mrg_walk_par_rows_cfg..., cfg..., } )
    { dsk       } = cfg
    { prefix    } = @cfg
    @db.setv 'dsk', dsk
    return @db.alt SQL"select * from #{prefix}_paragraphs;"

  #---------------------------------------------------------------------------------------------------------
  activate:   ( cfg ) -> @_set_active { cfg..., act: true, }
  deactivate: ( cfg ) -> @_set_active { cfg..., act: false, }

  #---------------------------------------------------------------------------------------------------------
  _set_active: ( cfg ) ->
    validate.mrg_set_active_cfg ( cfg = { @constructor.C.defaults.mrg_set_active_cfg..., cfg..., } )
    { dsk
      oln
      trk
      pce
      act } = cfg
    act     = if act then 1 else 0
    sql     = SQL"update mrg_mirror set act = $act where ( dsk = $dsk )"
    sql    += SQL" and ( oln = $oln )" if oln?
    sql    += SQL" and ( trk = $trk )" if trk?
    sql    += SQL" and ( pce = $pce )" if pce?
    sql    += SQL";"
    ( @db.prepare sql ).run { dsk, oln, trk, pce, act, }
    return null

  #=========================================================================================================
  # CONTENT MANIPULATION
  #---------------------------------------------------------------------------------------------------------
  # append_to_loc: ( cfg ) ->
    # validate.mrg_append_to_loc_cfg ( cfg = { @constructor.C.defaults.mrg_append_to_loc_cfg..., cfg..., } )














