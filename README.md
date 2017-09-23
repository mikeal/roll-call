# Roll Call

![demo gif](https://file-vpbygpmpka.now.sh)

On the surface, **Roll Call is quite simple**. Free calls for everyone in the world.

Try it now at: [rollcall.audio](https://rollcall.audio)

---

Roll Call is a completely free🎉 voice chat service with podcast
quality recording.

It's entirely Open Source and can be embedded into your own web pages
and web applications.

For more information on how to use Roll Call check out the
[FAQ](https://rollcall.audio/faq.html).

## Embedding

Roll Call can easily be embedded on your own website. The easiest way is
with a script include.

```html
<script src="https://cdn.jsdelivr.net/npm/roll-call@latest/dist/rollcall.js"></script>
<my-container>
  <roll-call call="myUniqueCallIdentifier"></roll-call>
</my-container>
```

Roll Call uses WebComponents. This means that you can use it like
any other HTML element and manipulate its state with JavaScript.

Or, if you want to build it into the JavaScript bundle for your own app
you can do so easily, but you'll need to handle loading a WebComponents
polyfill for most browsers on your own.

```javascript
const { Call } = require('roll-call')

let elem = new Call()
elem.call = 'myUniqueCallIdentifier'
document.body.appendChild(elem)
```

Once you require the script the elements are registered so you could also
do something like this.

```javascript
require('roll-call')

document.body.innerHTML += `<roll-call call="myUniqueCallIdentifier"></roll-call>`
```

## To Develop

Download the code and run `npm install`.

If you want to do development run:

```bash
npm install
npm start
```

## Try It Out

Roll Call is built and [deployed automatically](https://github.com/mikeal/roll-call/blob/master/scripts/deploy.sh):

 * [rollcall.audio](https://rollcall.audio) runs the [stable](https://github.com/mikeal/roll-call/tree/stable) branch.
 * [rollcall.audio/staging](https://rollcall.audio/staging/) runs the latest code on [master](https://github.com/mikeal/roll-call/tree/master).

## Wu-Tang Roll Call

```
The Rza,
the Gza,
Inspectah Deck,
Raekwon,
U-God,
Masta Killa,
Method Man,
Ghostface Killah,
and the late great Ol Dirty Bastard.
```
