
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-MIRAGE/HTML'
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
{ SQL }                   = GUY.str
{ HDML }                  = require 'hdml'
{ lets
  freeze
  thaw }                  = GUY.lft
{ HTMLISH }               = require './htmlish-parser'


#===========================================================================================================
types.declare 'constructor_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "( @isa.object x.mrg ) or ( @isa.function x.mrg )": ( x ) -> ( @isa.object x.mrg ) or ( @isa.function x.mrg )

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_parse_dsk_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":                         ( x ) -> @isa.nonempty_text x.dsk


#===========================================================================================================
class @Html

  #---------------------------------------------------------------------------------------------------------
  @C: GUY.lft.freeze
    defaults:
      #.....................................................................................................
      constructor_cfg:
        mrg:              null
        prefix:           null

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @cfg      = { @constructor.C.defaults.constructor_cfg..., cfg..., }
    GUY.props.hide @, 'types', types
    @types.validate.constructor_cfg @cfg
    { mrg, }  = GUY.obj.pluck_with_fallback @cfg, null, 'mrg'
    GUY.props.hide @, 'mrg', mrg
    GUY.props.hide @, 'HTMLISH', HTMLISH
    @cfg      = GUY.lft.freeze @cfg
    @_set_variables?()
    @_create_sql_functions?()
    @_procure_infrastructure?()
    @_compile_statements?()
    @_procure_infradata?()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _set_variables: ->

  #---------------------------------------------------------------------------------------------------------
  _create_sql_functions: ->
    { prefix } = @cfg
    #-------------------------------------------------------------------------------------------------------
    @mrg.db.create_window_function
      name:           "#{prefix}_html_create_tag"
      varargs:        false
      deterministic:  true
      start:          null
      step:           ( Σ, typ, tag, k, v, txt ) ->
        Σ            ?= { typ, tag, atrs: {}, txt, }
        Σ.atrs[ k ]   = v if k?
        return Σ
      inverse:        ( Σ, dropped ) -> return null unless Σ?; delete Σ.atrs[ k ]; Σ
      result:         ( Σ ) ->
        return '' unless Σ?
        return switch Σ.typ
          when 't' then HDML.escape_text Σ.txt
          when 'r' then "<!-- #{HDML.escape_text Σ.txt} -->"
          when 'b' then '\n'
          when 'e' then ( HDML.create_tag '<', 'error', Σ.atrs  ) + \
                        ( HDML.escape_text Σ.txt                ) + \
                        ( HDML.create_tag '>', 'error'          )
          else HDML.create_tag Σ.typ, Σ.tag, Σ.atrs
    #-------------------------------------------------------------------------------------------------------
    return null

  #---------------------------------------------------------------------------------------------------------
  _procure_infrastructure: ->
    ### TAINT skip if tables found ###
    { prefix  } = @cfg
    { db      } = @mrg
    db.set_foreign_keys_state false
    db SQL"""
      drop  index if exists #{prefix}_html_mirror_tag_idx;
      drop  view  if exists #{prefix}_html_tags_and_html;
      drop  table if exists #{prefix}_html_syntaxes;
      drop  table if exists #{prefix}_html_tags;
      drop  table if exists #{prefix}_html_typs;
      drop  table if exists #{prefix}_html_atrs;
      drop  table if exists #{prefix}_html_mirror;
      drop  table if exists #{prefix}_html_atrids;"""
    db.set_foreign_keys_state true
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_syntaxes (
          syntax    text    not null primary key );"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_tags (
          tag       text    not null primary key,
          is_block  boolean not null default false,
          is_empty  boolean not null default false,
          syntax    text    not null default 'html' references #{prefix}_html_syntaxes );"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_atrids (
          atrid integer not null,
        primary key ( atrid ),
        check ( atrid > 0 and floor( atrid ) = atrid ) );"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_atrs (
          atrid integer not null,
          k     text    not null,
          v     text    not null,
        primary key ( atrid, k ),
        foreign key ( atrid ) references #{prefix}_html_atrids,
        check ( length( k ) > 0 ) )
        strict;"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_typs (
          typ   text not null,
          name  text not null,
          primary key ( typ ),
          unique ( name ),
          check ( length( typ  ) = 1 ),
          check ( length( name ) > 0 ) );"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      insert into #{prefix}_html_typs values
          ( '<', 'otag'     ),
          ( '>', 'ctag'     ),
          ( '^', 'stag'     ),
          ( 'b', 'blank'    ),
          ( 't', 'text'     ),
          ( 'r', 'comment'  ),
          ( 'e', 'error'    );"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_mirror (
          dsk     text    not null,                         -- data source key
          oln     integer not null,                         -- original line nr (1-based)
          col     integer not null,                         -- column where `txt` starts
          trk     integer not null default 1,               -- track number
          pce     integer not null default 1,               -- piece number
          typ     text    not null,                         -- node type
          tag     text,                                     -- null for texts, comments
          syntax  text    references #{prefix}_html_syntaxes,
          atrid   integer,
          -- act     boolean not null default 1,               -- true: active, false: deleted
          txt     text,
        primary key ( dsk, oln, trk, pce ),
        foreign key ( dsk   ) references #{prefix}_datasources,
        foreign key ( typ   ) references #{prefix}_html_typs,
        foreign key ( atrid ) references #{prefix}_html_atrids,
        check ( length( tag ) > 0 ) );
      create index #{prefix}_html_mirror_tag_idx on #{prefix}_html_mirror ( tag );"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create view #{prefix}_html_tags_and_html as select distinct
          t.dsk                                                               as dsk,
          t.oln                                                               as oln,
          t.col                                                               as col,
          t.trk                                                               as trk,
          t.pce                                                               as pce,
          t.typ                                                               as typ,
          t.tag                                                               as tag,
          t.atrid                                                             as atrid,
          #{prefix}_html_create_tag( t.typ, t.tag, a.k, a.v, t.txt ) over w   as html
        from
          #{prefix}_html_mirror as t
          left join #{prefix}_html_atrs as a using ( atrid )
        where true
          and ( t.dsk = std_getv( 'dsk' ) )
        window w as (
          partition by t.dsk, t.oln, t.trk, t.pce
          order by a.k
          rows between unbounded preceding and unbounded following )
        order by t.dsk, t.oln, t.trk, t.pce;"""
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _procure_infradata: ->
    ### TAINT skip if tables found ###
    { prefix      } = @cfg
    { db          } = @mrg
    { insert_syntax
      insert_tag  } = @statements
    seen_syntaxes   = new Set()
    #.......................................................................................................
    db =>
      try
        for d in ( require './data-html5-tags' ).tags
          tag       = d.tag
          is_empty  = if d.is_empty then 1 else 0
          is_block  = if d.is_block then 1 else 0
          syntax    = d.syntax ? 'html'
          unless seen_syntaxes.has syntax
            seen_syntaxes.add syntax
            insert_syntax.run { syntax, }
          insert_tag.run { tag, is_empty, is_block, syntax, }
      catch error
        throw new db.E.DBay_internal_error '^mirage-html@1^', \
          "when trying to insert #{rpr d} or #{rpr { syntax, }}, an error occurred: #{error.message}"
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_statements: ->
    { prefix  } = @cfg
    { db      } = @mrg
    #.......................................................................................................
    GUY.props.hide @, 'statements',
      #.....................................................................................................
      insert_atrid: db.prepare_insert {
        into: "#{prefix}_html_atrids", returning: '*', exclude: [ 'atrid', ], }
      #.....................................................................................................
      ### NOTE we don't use `autoincrement` b/c this is the more general solution; details will change when
      the VNR gets more realistic (dsk, linenr, ...) ###
      insert_content: db.prepare SQL"""
        with v1 as ( select
            coalesce( max( pce ), 0 ) + 1 as pce
          from #{prefix}_html_mirror
          where true
            and ( dsk = $dsk )
            and ( oln = $oln )
            and ( trk = $trk ) )
        insert into #{prefix}_html_mirror ( dsk, oln, col, trk, pce, typ, tag, syntax, atrid, txt )
          values ( $dsk, $oln, $col, $trk, ( select pce from v1 ), $typ, $tag, $syntax, $atrid, $txt )
          returning *;"""
      #.....................................................................................................
      insert_atr: db.prepare_insert     { into: "#{prefix}_html_atrs",      returning: null, }
      insert_tag: db.prepare_insert     { into: "#{prefix}_html_tags",      returning: null, }
      insert_syntax: db.prepare_insert  { into: "#{prefix}_html_syntaxes",  returning: null, }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  render_dsk: ( cfg ) ->
    { dsk     } = cfg
    { db      } = @mrg
    { prefix  } = @cfg
    db.setv 'dsk', dsk
    return ( db.all_first_values SQL"select html from #{prefix}_html_tags_and_html;" ).join ''

  #---------------------------------------------------------------------------------------------------------
  _append_tag: ( dsk, oln, col, trk, typ, tag, syntax, atrs = null, text = null ) ->
    atrid = null
    if atrs?
      { atrid } = @mrg.db.first_row @statements.insert_atrid
      for k, v of atrs
        v = rpr v unless isa.text v
        @statements.insert_atr.run { atrid, k, v, }
    return @statements.insert_content.get { dsk, oln, col, trk, typ, tag, syntax, atrid, txt: text, }

  #---------------------------------------------------------------------------------------------------------
  ### TAINT consider to cache ###
  _get_tag_catalog: -> @mrg.db.as_object 'tag', SQL"""
      select
          *
        from #{@cfg.prefix}_html_tags
        where ( syntax != 'html' ) or ( is_block ) or ( is_empty );"""

  #---------------------------------------------------------------------------------------------------------
  parse_dsk: ( cfg ) ->
    validate.mrg_parse_dsk_cfg ( cfg = { @constructor.C.defaults.mrg_parse_dsk_cfg..., cfg..., } )
    { dsk } = cfg
    #.......................................................................................................
    @mrg.db.with_transaction =>
      for { oln1, wslc, trk, txt, } from @mrg.walk_par_rows { dsk, }
        tokens = @HTMLISH.parse txt, @_get_tag_catalog()
        for d in tokens
          oln = oln1 + d.delta_lnr ? 0
          col = d.col
          switch d.$key
            when '<tag'     then @_append_tag dsk, oln, col, trk, '<', d.name, d.syntax, d.atrs
            when '>tag'     then @_append_tag dsk, oln, col, trk, '>', d.name, d.syntax, d.atrs
            when '^tag'     then @_append_tag dsk, oln, col, trk, '^', d.name, d.syntax, d.atrs
            when '^text'    then @_append_tag dsk, oln, col, trk, 't', null,   d.syntax, null, d.text
            when '^comment', '^doctype'
              @_append_tag dsk, oln, col, trk, 'r', null, d.syntax, null, d.text.replace /^<!--\s*(.*?)\s*-->$/, '$1'
            when '^error'
              warn '^435345^', "error #{rpr d}"
              atrs = { start: d.start, stop: d.stop, code: d.code, }
              @_append_tag dsk, oln, col, trk, 'e', null, d.syntax, atrs, "#{d.message}: #{rpr d.text}"
            else
              warn '^435345^', "unhandled token #{rpr d}"
              atrs  = { start: d.start, stop: d.stop, code: 'unhandled', }
              d     = { $key: d.$key, name: d.name, type: d.type, }
              @_append_tag dsk, oln, col, trk, 'e', null, atrs, "unhandled token: #{rpr d}"
        for _ in [ 1 .. wslc + 1 ]
          @_append_tag dsk, oln ? oln1, col ? 1, trk, 'b', null, null, null, '\n'
    return null





