# Typedoc-plugin-tutorials

__*Important notice:* This plugin is deprecated. Please use [@knodes/typedoc-plugin-pages](https://www.npmjs.com/package/@knodes/typedoc-plugin-pages) instead__

---

This typedoc plugin allows you to create tutorials for your typedoc documentation. Those tutorial pages will be generated using your theme. The tutorial index is added as a doc page visible in the global menu of your documentation. This page generates a basic index page containing all your tutorials.

Example generated tutorials page: https://gerkindev.github.io/vuejs-datatable/tutorials/index.html

Example `typedoc.json` file:

```json
{
	"tutorials-map": "./tutorials/tutorials.json",
	"tutorials-directory": "./tutorials"
}
```

In this examples, tutorials general informations (**title**, description & children) will be loaded from `./tutorials/tutorials.json`. Markdown files (`.md`) are expected to be found under the `./tutorials` directory.

Example `tutorials.json` file

```json
{
	"my-first-tutorial": {
		"title": "My first tutorial",
		"description": "This tutorial is just an introduction",
		"children": {
			"my-second-tutorial": {
				"title": "My second tutorial",
				"description": "This tutorial is a child of the 1st tutorial"
			}
		}
	},
	"hello-world": {
		"title": "Hello world"
	}
}
```

This configuration will look for `my-first-tutorial.md`, `my-second-tutorial.md` & `hello-world.md` in the specified tutorials directory and render them as tutorial pages.

Each tutorial key **must** be unique, even through children.

In your doc comments, linking with tutorials can be done the following ways: 

```ts
/**
 * This is the description of the doc comment. Here is a link to [[tutorial:my-first-tutorial]].
 *
 * @tutorial my-second-tutorial An optional descriptionto attach to the tutorial
 */
void myFunc(){}
```
