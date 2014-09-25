# Commonplace

Commonplace is the place for reusable components for the Firefox Marketplace (mozilla/fireplace).

[![Build Status](https://travis-ci.org/mozilla/commonplace.png?branch=master)](https://travis-ci.org/mozilla/commonplace)

## Getting Started

###  Install node/npm

#### OS X

Use `boxen` to install a node environment, or use `homebrew`:

```bash
brew install node
```

And make sure that `/usr/local/share/npm/bin` is in your `$PATH`, à la:

```bash
export PATH=/usr/local/share/npm/bin:$PATH
```

### Setting up your repo

Create a new repository for your project. In it, create a basic `package.json` file. You can do this very easily by running `npm init`.

Next, install commonplace by running `npm install commonplace -g`. If you already have commonplace installed, update it with `npm update -g commonplace`.

### Creating the commonplace base template

At this point, simply run `commonplace install`. Running this command will create a `src/` directory in your project containing the minimum files needed to run your code. Other directories will also be created for L10n and other functions.

The `--gitignore` option is available for `commonplace install`. It will copy a `.gitignore` into your project. If one already exists, it will print a command to allow you to manually overwrite your current `.gitignore` file.

## Updating Commonplace

To update your commonplace installation, simply run `commonplace update --npm` from the root of your project. Commonplace will automatically update the global commonplace library to the latest version and update all of the shared modules.

## I have questions! Where do I look for more information?

You can check out the [Wiki](https://github.com/mozilla/commonplace/wiki/_pages), which has plenty of documentation about the project.
