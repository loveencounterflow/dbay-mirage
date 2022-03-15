

# 𓆤DBay 𓁛Mirage HTMLish Syntax



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓁛Mirage HTMLish Syntax](#%F0%93%86%A4dbay-%F0%93%81%9Bmirage-htmlish-syntax)
  - [Swappers](#swappers)
  - [Mixing Markdownish and HTMLish](#mixing-markdownish-and-htmlish)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# 𓆤DBay 𓁛Mirage HTMLish Syntax


* HTMLish allows [SGML Null End Tag
  syntax](https://en.wikipedia.org/wiki/Standard_Generalized_Markup_Language#NET) which allows for neat
  notations without requiring users to invent a new syntax for the purpose, e.g. `<art/an/ <adj/empty/
  <n/room/ <adv/full/ <prep/of/ <n/thoughts/`

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

* Likely a Mistake
  * `<title/My Page/>`: right pointy bracket not part of markup

* Observe that
  * in HTMLish, both `<title//` and `<title/>` are equivalent to `<title></title>`
  * tags declared to be 'empty' can be written both with and without closing slash (`<br>` and `<br/>` are
    equivalent)
  * any tag without content can be written in its short form, so e.g. `<div/>` is allowed (as is `<div//`)

## Swappers

Swappers are sign posts in the source text that delineate regions of different syntax.

* in HTMLish,
  * `/<script\b/g` starts a script. Inside a script block, no tags or Markdownish syntax is recognized
    except for the closing `/<\/script>/g`.
  * `/<xmp\b/g` starts a literal block; inside a literal block, no tags (except the closing one) and no
    Markdownish markup is recognized and characters like `<` and `&` do not have to be escaped or replaced
    by entities. Closed by `/<\/xmp>/g`.
* in Markdownish,
  * `/```/g` starts a so-called Fenced Code Block (FCB); closed by `/```/g`.

The present implementation will scan the entire content of a source file line by line, noting which swappers
were found on which lines, and record matches in a table (`mrg_swapper_matches`). This happens before the
parsing of Markdownish and HTMLish syntax proper sets in, so those parsers can be instructed to skip over
parts of the document that is of no concern to them. For example, consider the following snippet:

~~~md
This is an abso**lute**ly surprising formula:

```
0=x**y**z
```
~~~


When typeset in a place where Markdown is in effect, 0=x**y**z


## Mixing Markdownish and HTMLish

* HTML nested inside Markdown
  * `*<b>bold</b>*: <b>bold</b> inside of *italic*`
    * *<b>bold</b>*: <b>bold</b> inside of *italic*

* Markdown nested inside HTML
  * `<i>**bold**</i>: **bold** inside of <i>italic</i>`
    * <i>**bold**</i>: **bold** inside of <i>italic</i>

* italic link
  * `[this page](/README-htmlish-syntax.md)`
    * [this page](/README-htmlish-syntax.md)
  * `*[this page](/README-htmlish-syntax.md)*`
    * *[this page](/README-htmlish-syntax.md)*
  * `<em>[this page](/README-htmlish-syntax.md)</em>`
    * <em>[this page](/README-htmlish-syntax.md)</em>
  * `*<a href='/README-htmlish-syntax.md'>this page</a>*`
    * *<a href='/README-htmlish-syntax.md'>this page</a>*

## To Do

* **[–]** consider to prefer `<tag/content/>` over `<tag/content/` because then pointy brackets remain
  balanced
* **[–]** consider to allow to use several slashes or other punctuation to make it possible for any content
  to appear without escapes, e.g. instead of `<url/https:\/\/en.wikipedia.org\/wiki\//>` one could write
  `<url°°°https://en.wikipedia.org/wiki/°°°>` (or `<url°°°https://en.wikipedia.org/wiki/°°°` as the case may
  be).
* **[–]** implement parsing of XNCRs (`&xy;`, `&#123;`, `&#x1a3;`, `&jzr#x1a3;`)
* **[–]** unify output for Empty Tags ( `<t/>`, `<t//`, `<t></t>`)
* **[–]** make it a syntax error to use closing tags for tags that are empty by definition, so `<br>` is
  legal and means the same as `<br/>` and `<br//`, but `</br>` causes an error.
  * **[–]** distinguish between Empty Tags and tags that happen to have no content (zero content tags?)



