
# 𓆤DBay 𓁛Mirage

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓁛Mirage](#%F0%93%86%A4dbay-%F0%93%81%9Bmirage)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# 𓆤DBay 𓁛Mirage


DBay plugin to mirror, parse and process text files (HTML, CSV, ...) in SQL

This module has been pulled from [a preliminary version in
`dbay-rustybuzz`](https://github.com/loveencounterflow/dbay-rustybuzz)

🚧 Work in progress 🚧

## To Do

* table `mrg_datasources`
  * **[–]** there might be datasources we do want to import data from *without* mirroring them, so there
    should be a flag for that.
  * **[–]** there may be direct input or results of HTTP queries &cpp so better use URLs instead of file
    system paths
* HTML:
  **[+]** empty lines between paragraphs should be preserved
  **[–]** what to do for trailing blank lines?
  **[–]** tag registry so we can decide whether tag
    * is block
    * allows parsing inside (cf `<script>`, `<code>`)
  **[–]** run all inserts to mirage HTML in single transaction
  **[–]** consider to add CFG to `walk_par_rows()` to indicate whether to keep or to skip empty/blank lines
  **[–]** implement datasources with direct text input
  **[–]** in `mrg_wspars`, use field `mrg_*mirror.mat` or constant `txt = ''` instead of function call
  **[+]** accept `<!doctype>` tags (turn into comments)

