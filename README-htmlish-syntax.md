

# 𓆤DBay 𓁛Mirage HTMLish Syntax



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓁛Mirage HTMLish Syntax](#%F0%93%86%A4dbay-%F0%93%81%9Bmirage-htmlish-syntax)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# 𓆤DBay 𓁛Mirage HTMLish Syntax


* HTMLish allows [SGML Null End Tag
  syntax](https://en.wikipedia.org/wiki/Standard_Generalized_Markup_Language#NET) which allows for neat
  notations without requiring another syntax, e.g. `<entry/house, the/ <german/Haus, das/ <french/maison,
  la/`

* OK:
	* `<title>My Page</title>`: ordinary tag
	* `<title/>`: any tag can be left empty (as per the syntax; semantics may still cause error)
	* `<title/My Page/`: content allowed in Null End Tags
	* `<title/My\/Your Page/`: slashes must be escaped in Null End Tags
	* `<title/My⏎Page/`: line break allowed in Null End Tags
	* `<title k=v j=w/My Page/`: Null End Tags can have attributes
	* `<title//`: empty content allowed in Null End Tags

* Not OK
	* `<title/<b>My</b> Page/`: nesting tags not allowed inside Null End Tags
	* `<title/My Page/>`: right pointy bracket not part of markup




