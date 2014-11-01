# Commonplace

Reusable components for Firefox Marketplace frontend projects.

[![Build Status](https://travis-ci.org/mozilla/commonplace.png?branch=master)](https://travis-ci.org/mozilla/commonplace)

## Adding a Component

Components are stored in the ```dist``` directory. There are currently several
folders in ```dist``` that group the components:

- ```contrib```: JS modules that aren't necessary, but can be useful for some
    projects.
- ```contrib-css```: CSS components that aren't the part of the base styles,
    but are possibly shared between some projects.
- ```core```: necessary JS modules that power all of our projects, the Commonplace framework.
- ```core-css```: base CSS components that ship with every project for visual consistency.
- ```core-templates```: reusable templates that every project uses
- ```contrib-templates```: reusable templates that some projects use

### Adding a Core JS Component

When adding an integral component that should be distributed to all Commonplace
projects, first add the files to ```dist/core```. Then we add the name of the
core module to ```CORE_MODULES``` in ```lib/config.js```. This will make it
so Commonplace projects won't have to manually configure them into their
RequireJS configurations.

## Updating a Component

When you add or update a component, you presumably want projects to be able
to consume that component. We use **Bower** to manage our components.

- Bump the version in ```bower.json```.
- Git tag that version and push to Github.

Then your projects should be able grab the new or updated component from Bower.
For Commonplace projects, you can run ```make update``` to get these components
into your project and into your RequireJS development configuration.

## Creating a New Commonplace Project

Clone the [Marketplace template](https://github.com/mozilla/marketplace-template).

Run ```make init```. This will download dependencies from Commonplace via Bower
and set up a couple of configurations.

## I have questions! Where do I look for more information?

You can check out the
[Wiki](https://github.com/mozilla/commonplace/wiki/_pages), which has plenty of
documentation about the project and the Commonplace framework.
