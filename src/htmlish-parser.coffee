
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-MIRAGE/HTMLISH-PARSER'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
types                     = new ( require 'intertype' ).Intertype()
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
GUY                       = require 'guy'
_HTMLISH                  = ( require 'paragate/lib/htmlish.grammar' ).new_grammar { bare: true, }
{ lets
  freeze
  thaw }                  = GUY.lft
TIMETUNNEL                = require 'timetunnel'
{ Moonriver }             = require 'moonriver'
{ $ }                     = Moonriver


#===========================================================================================================
### TAINT use more relaxed syntax for names ###
# G: grouped
# O: optional
xncr          = {}
xncr.nameG    = ( ///     (?<name>      [a-z][a-z0-9]* )       /// ).source
xncr.nameOG   = ( /// (?: (?<csg>   (?: [a-z][a-z0-9]* ) ) | ) /// ).source
xncr.hexG     = ( /// (?:     x  (?<hex> [a-fA-F0-9]+ )      ) /// ).source
xncr.decG     = ( ///            (?<dec> [      0-9]+ )        /// ).source
xncr.matcher  = /// ^ & #{xncr.nameG} ; | & #{xncr.nameOG} \# (?: #{xncr.hexG} | #{xncr.decG} ) ; $ ///
xncr.splitter = /// ( & [^\s;]+ ; ) ///


#===========================================================================================================
class @Htmlish

  #---------------------------------------------------------------------------------------------------------
  @C: GUY.lft.freeze
    xncr: xncr

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ->
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  _tunnel: ( text ) ->
    ### TAINT do not reconstruct tunnel for each call ###
    # guards    = 'äöüßp'
    # guards    = '①②③④⑤'
    guards    = '¥₽₨฿₮'
    intalph   = '0123456789'
    tnl       = new TIMETUNNEL.Timetunnel { guards, intalph, }
    tnl.add_tunnel TIMETUNNEL.tunnels.keep_backslash
    # tnl.add_tunnel TIMETUNNEL.tunnels.remove_backslash
    text      = tnl.hide text
    return { text, reveal: ( tnl.reveal.bind tnl ), }

  #---------------------------------------------------------------------------------------------------------
  _entity_token_from_match: ( d, start, stop, match ) ->
    g         = match.groups
    R         = { d..., }
    R.$key    = '^entity'
    R.text    = match[ 0 ]
    R.start   = start
    R.stop    = stop
    if g.name?
      R.type    = 'named'
      R.name    = g.name
    else
      R.type    = if g.csg? then 'xncr' else 'ncr'
      R.csg     = g.csg if g.csg?
      R.$value  = parseInt g.hex ? g.dec, ( if g.hex? then 16 else 10 )
    return R

  #---------------------------------------------------------------------------------------------------------
  _text_token_from_part: ( d, start, stop, part ) ->
    R       = { d..., }
    R.text  = part
    R.start = start
    R.stop  = stop
    return R

  #---------------------------------------------------------------------------------------------------------
  parse: ( text, non_html_tags = null ) ->
    ### TAINT use `cfg` pattern ###
    ### TAINT do not reconstruct pipeline on each run ###
    { text
      reveal  }   = @_tunnel text
    tokens        = thaw _HTMLISH.parse text
    stack         = []
    R             = []
    mr            = new Moonriver()
    xncr_matcher  = @constructor.C.xncr.matcher
    xncr_splitter = @constructor.C.xncr.splitter
    #-------------------------------------------------------------------------------------------------------
    mr.push tokens
    #-------------------------------------------------------------------------------------------------------
    mr.push $add_location = ( d, send ) =>
      [ lnr
        col       ] = d.$vnr ? [ null, null, ]
      d.delta_lnr   = lnr - 1
      d.col         = col
      send d
    #-------------------------------------------------------------------------------------------------------
    if non_html_tags?
      mr.push $filter_nonhtml_syntax = do =>
        wait_for_name = null
        return ( d, send ) =>
          if wait_for_name?
            #...............................................................................................
            if ( d.$key is '>tag' ) and ( d.name is wait_for_name )
              wait_for_name = null
              return send d
            #...............................................................................................
            e = { d..., }
            e.$key  = '^rawtext'
            delete e.atrs
            return send e
          #.................................................................................................
          if ( d.$key is '<tag' ) and ( non_html_tags.has d.name )
            wait_for_name = d.name
          #.................................................................................................
          send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $parse_ncrs = ( d, send ) =>
      return send d unless ( d.$key is '^text' )
      parts     = d.text.split xncr_splitter
      return send d unless parts.length > 1
      is_entity = true
      start     = 0
      #.....................................................................................................
      for part in parts
        is_entity = not is_entity
        continue if part is ''
        stop      = start + part.length
        #...................................................................................................
        if is_entity and ( match = part.match xncr_matcher )?
          send @_entity_token_from_match d, start, stop, match
        else
          send @_text_token_from_part d, start, stop, part
        #...................................................................................................
        start = stop
      return null
    #-------------------------------------------------------------------------------------------------------
    mr.push $complain_about_bareachrs = ( d, send ) =>
      return send d unless ( d.$key is '^text' )
      #.....................................................................................................
      if ( d.$key is '^text' )
        if ( /(?<!\\)[<&]/.test d.text )
          @_as_error d, '^ð1^', 'bareachrs', "bare active characters"
      #.....................................................................................................
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $reveal_tunneled_text = ( d, send ) =>
      return send d unless ( d.$key is '^text' ) or ( d.$key is '^rawtext' )
      d.text = reveal d.text
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $remove_backslashes = ( d, send ) =>
      return send d unless ( d.$key is '^text' )
      d.text = d.text.replace /\\</g,     '&lt;'  ### TAINT conflicts with NCR parsing ###
      d.text = d.text.replace /\\&/g,     '&amp;' ### TAINT conflicts with NCR parsing ###
      d.text = d.text.replace /\\\n/ugs,  ''    ### replace escaped newlines with empty string ###
      d.text = d.text.replace /\\(.)/ugs, '$1'  ### obliterate remaining backslashes (exc. escaped ones) ###
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $treat_xws_in_opening_tags = ( d, send ) =>
      return send d unless ( d.$key is '<tag' )
      if ( d.type is 'otag' ) and ( /^<\s+/.test d.text )
        @_as_error d, '^ð1^', 'xtraows', "extraneous whitespace before tag name"
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $treat_xws_in_closing_tags = ( d, send ) =>
      return send d unless ( d.$key is '>tag' )
      if ( d.type is 'ctag' ) and ( ( /^<\s*\/\s+/.test d.text ) or ( /^<\s+\/\s*/.test d.text ) )
        @_as_error d, '^ð2^', 'xtracws', "extraneous whitespace in closing tag"
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $handle_stack_open = ( d, send ) =>
      stack.push d if ( d.$key is '<tag' ) # and ( d.type is 'ctag' )
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $handle_stack_close = ( d, send ) =>
      # debug '^398^', stack
      return send d unless ( d.$key is '>tag' )
      #.....................................................................................................
      if stack.length is 0
        return send @_as_error d, '^ð2^', 'xtractag', "extraneous closing tag </#{d.name}>"
      #.....................................................................................................
      matching_d = stack.pop()
      if d.name?
        if ( d.name != matching_d.name )
          return send @_as_error d, '^ð2^', 'nomatch', "expected </#{matching_d.name}>, got </#{d.name}>"
      #...................................................................................................
      else
        d.name = matching_d.name
      send d
    #-------------------------------------------------------------------------------------------------------
    mr.push $relabel_rawtexts = ( d, send ) ->
      urge '^387^', rpr d.text
      d.$key = '^text' if d.$key is '^rawtext'
      send d
    # #-------------------------------------------------------------------------------------------------------
    # mr.push $consolidate_texts = do =>
    #   last          = Symbol 'last'
    #   # prv_was_text  = false
    #   send          = null
    #   collector     = []
    #   #.....................................................................................................
    #   flush = ->
    #     # prv_was_text      = false
    #     return if collector.length is 0
    #     d = collector[  0 ]
    #     if collector.length > 1
    #       d.text  = ( e.text for e in collector ).join ''
    #       d.stop  = collector[ collector.length - 1 ].stop
    #     send d
    #     collector.length  = 0
    #   #.....................................................................................................
    #   return $ { last, }, ( d, _send ) ->
    #     send = _send
    #     return flush() if d is last
    #     unless d.$key is '^text'
    #       flush()
    #       return send d
    #     collector.push d
    #-------------------------------------------------------------------------------------------------------
    mr.push ( d ) => R.push d
    mr.drive()
    return R

  #---------------------------------------------------------------------------------------------------------
  _as_error: ( token, ref, code, message ) ->
    token.$key    = '^error'
    token.origin  = 'htmlish'
    token.code    = code
    token.message = message
    token.$       = ref
    return token

#-----------------------------------------------------------------------------------------------------------
@HTMLISH = HTMLISH = new @Htmlish()

