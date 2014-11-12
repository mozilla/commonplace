[![Build Status](https://travis-ci.org/mozilla/commonplace.png?branch=master)](https://travis-ci.org/mozilla/commonplace)

Necessary Node modules for Marketplace frontend projects.

- [Marketplace frontend documentation](https://marketplace-frontend.readthedocs.org)
- [Marketplace documentation](https://marketplace.readthedocs.org)

Commonplace includes:

- Common Bower and require.js configuration
- Nunjucks template compilation optimizer
- Localization extraction and language pack generation

## Do I bump bower.json or package.json?

If you are modifying a file in ```dist```, you bump bower.json and tag it.

If you are modifying a file in ```lib```, you bump package.json and publish it.

## Creating a New Marketplace Frontend Project

Clone the [Marketplace template](https://github.com/mozilla/marketplace-template).

Run ```make init```. This will download dependencies and set things up.
