(function() {
  this.syntaxes = [
    {
      syntax: 'html',
      remove_backslashes: true,
      expand_ncrs: true,
      escape_ltamp: true
    },
    {
      syntax: 'script',
      remove_backslashes: true,
      expand_ncrs: true,
      escape_ltamp: false
    },
    {
      syntax: 'literal',
      remove_backslashes: true,
      expand_ncrs: true,
      escape_ltamp: true
    },
    {
      syntax: 'code',
      remove_backslashes: true,
      expand_ncrs: true,
      escape_ltamp: true
    }
  ];

  this.fences = [
    {
      name: 'html_script',
      open: /<script\b/g,
      close: /<\/script>/g,
      environment: 'html',
      syntax: 'script'
    },
    {
      name: 'html_codeb',
      open: /<code\b/g,
      close: /<\/code>/g,
      environment: 'html',
      syntax: 'code'
    },
    {
      name: 'html_xmp',
      open: /<xmp\b/g,
      close: /<\/xmp>/g,
      environment: 'html',
      syntax: 'literal'
    },
    {
      name: 'md_fcb',
      either: /```/g,
      environment: 'md',
      syntax: 'code'
    }
  ];

  this.tags = [
    {
      tag: 'a'
    },
    {
      tag: 'abbr'
    },
    {
      tag: 'acronym'
    },
    {
      tag: 'address',
      is_block: true
    },
    {
      tag: 'applet'
    },
    {
      tag: 'area',
      is_empty: true
    },
    {
      tag: 'article',
      is_block: true
    },
    {
      tag: 'aside',
      is_block: true
    },
    {
      tag: 'audio'
    },
    {
      tag: 'b'
    },
    {
      tag: 'base',
      is_empty: true
    },
    {
      tag: 'basefont'
    },
    {
      tag: 'bdi'
    },
    {
      tag: 'bdo'
    },
    {
      tag: 'big'
    },
    {
      tag: 'blockquote',
      is_block: true
    },
    {
      tag: 'body'
    },
    {
      tag: 'br',
      is_empty: true
    },
    {
      tag: 'button'
    },
    {
      tag: 'canvas'
    },
    {
      tag: 'caption'
    },
    {
      tag: 'center'
    },
    {
      tag: 'cite'
    },
    {
      tag: 'code'
    },
    {
      tag: 'col',
      is_empty: true
    },
    {
      tag: 'colgroup'
    },
    {
      tag: 'data'
    },
    {
      tag: 'datalist'
    },
    {
      tag: 'dd',
      is_block: true
    },
    {
      tag: 'del'
    },
    {
      tag: 'details',
      is_block: true
    },
    {
      tag: 'dfn'
    },
    {
      tag: 'dialog',
      is_block: true
    },
    {
      tag: 'div',
      is_block: true
    },
    {
      tag: 'dl',
      is_block: true
    },
    {
      tag: 'dt',
      is_block: true
    },
    {
      tag: 'em'
    },
    {
      tag: 'embed',
      is_empty: true
    },
    {
      tag: 'fieldset',
      is_block: true
    },
    {
      tag: 'figcaption',
      is_block: true
    },
    {
      tag: 'figure',
      is_block: true
    },
    {
      tag: 'font'
    },
    {
      tag: 'footer',
      is_block: true
    },
    {
      tag: 'form',
      is_block: true
    },
    {
      tag: 'frame'
    },
    {
      tag: 'frameset'
    },
    {
      tag: 'h1',
      is_block: true
    },
    {
      tag: 'h2',
      is_block: true
    },
    {
      tag: 'h3',
      is_block: true
    },
    {
      tag: 'h4',
      is_block: true
    },
    {
      tag: 'h5',
      is_block: true
    },
    {
      tag: 'h6',
      is_block: true
    },
    {
      tag: 'head'
    },
    {
      tag: 'header',
      is_block: true
    },
    {
      tag: 'hgroup',
      is_block: true
    },
    {
      tag: 'hr',
      is_empty: true,
      is_block: true
    },
    {
      tag: 'html'
    },
    {
      tag: 'i'
    },
    {
      tag: 'iframe'
    },
    {
      tag: 'img',
      is_empty: true
    },
    {
      tag: 'input',
      is_empty: true
    },
    {
      tag: 'ins'
    },
    {
      tag: 'kbd'
    },
    {
      tag: 'keygen'
    },
    {
      tag: 'label'
    },
    {
      tag: 'legend'
    },
    {
      tag: 'li',
      is_block: true
    },
    {
      tag: 'link',
      is_empty: true
    },
    {
      tag: 'main',
      is_block: true
    },
    {
      tag: 'map'
    },
    {
      tag: 'mark'
    },
    {
      tag: 'menu'
    },
    {
      tag: 'menuitem'
    },
    {
      tag: 'meta',
      is_empty: true
    },
    {
      tag: 'meter'
    },
    {
      tag: 'nav',
      is_block: true
    },
    {
      tag: 'noscript'
    },
    {
      tag: 'object'
    },
    {
      tag: 'ol',
      is_block: true
    },
    {
      tag: 'optgroup'
    },
    {
      tag: 'option'
    },
    {
      tag: 'output'
    },
    {
      tag: 'p',
      is_block: true
    },
    {
      tag: 'param',
      is_empty: true
    },
    {
      tag: 'pre',
      is_block: true
    },
    {
      tag: 'progress'
    },
    {
      tag: 'q'
    },
    {
      tag: 'rb'
    },
    {
      tag: 'rp'
    },
    {
      tag: 'rt'
    },
    {
      tag: 'rtc'
    },
    {
      tag: 'ruby'
    },
    {
      tag: 's'
    },
    {
      tag: 'samp'
    },
    {
      tag: 'script',
      syntax: 'script'
    },
    {
      tag: 'section',
      is_block: true
    },
    {
      tag: 'select'
    },
    {
      tag: 'small'
    },
    {
      tag: 'source',
      is_empty: true
    },
    {
      tag: 'span'
    },
    {
      tag: 'strike'
    },
    {
      tag: 'strong'
    },
    {
      tag: 'style'
    },
    {
      tag: 'sub'
    },
    {
      tag: 'summary'
    },
    {
      tag: 'sup'
    },
    {
      tag: 'table',
      is_block: true
    },
    {
      tag: 'tbody'
    },
    {
      tag: 'td'
    },
    {
      tag: 'template'
    },
    {
      tag: 'textarea'
    },
    {
      tag: 'tfoot'
    },
    {
      tag: 'th'
    },
    {
      tag: 'thead'
    },
    {
      tag: 'time'
    },
    {
      tag: 'title'
    },
    {
      tag: 'tr'
    },
    {
      tag: 'track',
      is_empty: true
    },
    {
      tag: 'u'
    },
    {
      tag: 'ul',
      is_block: true
    },
    {
      tag: 'var'
    },
    {
      tag: 'video'
    },
    {
      tag: 'wbr',
      is_empty: true
    },
    {
      tag: 'xmp',
      syntax: 'literal'
    }
  ];

}).call(this);

//# sourceMappingURL=data-html5-tags.js.map