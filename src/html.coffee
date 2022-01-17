
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
SQL                       = String.raw
GUY                       = require 'guy'
{ HTMLISH: ITXH }         = require 'intertext'
{ HDML }                  = require 'hdml'


#===========================================================================================================
types.declare 'constructor_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "( @isa.object x.mrg ) or ( @isa.function x.mrg ":  ( x ) -> ( @isa.object x.mrg ) or ( @isa.function x.mrg )




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
    @cfg      = GUY.lft.freeze @cfg
    @_set_variables?()
    @_create_sql_functions?()
    @_procure_infrastructure?()
    @_compile_statements?()
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
      step:           ( Σ, sgl, tag, k, v ) ->
        Σ            ?= { sgl, tag, atrs: {}, }
        Σ.atrs[ k ]   = v if k?
        return Σ
      inverse:        ( Σ, dropped ) -> return null unless Σ?; delete Σ.atrs[ k ]; Σ
      result:         ( Σ ) -> return '' unless Σ?; HDML.create_tag Σ.sgl, Σ.tag, Σ.atrs
    #-------------------------------------------------------------------------------------------------------
    return null

  #---------------------------------------------------------------------------------------------------------
  _procure_infrastructure: ->
    ### TAINT skip if tables found ###
    { prefix  } = @cfg
    { db      } = @mrg
    db SQL"""
      drop view  if exists #{prefix}_html_tags_and_html;
      drop table if exists #{prefix}_html_atrs;
      drop table if exists #{prefix}_html_mirror;
      drop table if exists #{prefix}_html_atrids;"""
    #-------------------------------------------------------------------------------------------------------
    db SQL"""
      create table #{prefix}_html_atrids (
          atrid integer not null,
        primary key ( atrid ) );"""
    db SQL"""
      create table #{prefix}_html_atrs (
          atrid integer not null,
          k     text    not null,
          v     text    not null,
        primary key ( atrid, k ),
        foreign key ( atrid ) references #{prefix}_html_atrids );"""
    db SQL"""
      create table #{prefix}_html_mirror (
          dsk   text    not null,
          tid   integer not null,
          sgl   text    not null,      -- sigil, one of `<`, `>`, `^`
          tag   text    not null,      -- use '$text' for text nodes
          atrid integer,
          text  text,
        primary key ( dsk, tid ),
        foreign key ( dsk   ) references #{prefix}_datasources,
        foreign key ( atrid ) references #{prefix}_html_atrids );"""
    db SQL"""
      create view #{prefix}_html_tags_and_html as select distinct
          t.tid                                                     as tid,
          t.sgl                                                     as sgl,
          t.tag                                                     as tag,
          t.atrid                                                   as atrid,
          case t.tag when '$text' then t.text
          else #{prefix}_html_create_tag( t.sgl, t.tag, a.k, a.v ) over w end  as xxx
        from
          #{prefix}_html_mirror as t
          left join #{prefix}_html_atrs as a using ( atrid )
        where true
          and ( t.dsk = std_getv( 'dsk' ) )
        window w as (
          partition by t.tid
          order by a.k
          rows between unbounded preceding and unbounded following )
        order by tid;"""
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_statements: ->
    { prefix  } = @cfg
    { db      } = @mrg
    #.......................................................................................................
    GUY.props.hide @, 'statements',
      insert_atrid:      db.prepare_insert {
        into: "#{prefix}_html_atrids", returning: '*', exclude: [ 'atrid', ], }
      ### NOTE we don't use `autoincrement` b/c this is the more general solution; details will change when
      the VNR gets more realistic (dsk, linenr, ...) ###
      insert_content:    db.prepare SQL"""
        with v1 as ( select coalesce( max( tid ), 0 ) + 1 as tid from #{prefix}_html_mirror where dsk = $dsk )
        insert into #{prefix}_html_mirror ( dsk, tid, sgl, tag, atrid, text )
          values ( $dsk, ( select tid from v1 ), $sgl, $tag, $atrid, $text )
          returning *;"""
      insert_atr:        db.prepare_insert { into: "#{prefix}_html_atrs",         returning: null, }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _append_tag: ( dsk, sgl, tag, atrs = null, text = null ) ->
    atrid = null
    if text?
      validate.null atrs
    else if atrs?
      validate.null text
      { atrid } = @mrg.db.first_row @statements.insert_atrid
      for k, v of atrs
        v = rpr v unless isa.text v
        @statements.insert_atr.run { atrid, k, v, }
    urge @mrg.db.first_row @statements.insert_content, { dsk, sgl, tag, atrid, text, }
    return null

  #---------------------------------------------------------------------------------------------------------
  render_dsk: ( cfg ) ->
    { dsk     } = cfg
    { db      } = @mrg
    { prefix  } = @cfg
    db.setv 'dsk', dsk
    return ( db.all_first_values SQL"select xxx from #{prefix}_html_tags_and_html;" ).join ''

