# Roll Call

Roll Call is a completely free🎉 voice chat service with podcast
quality recording.

<p>
  <a href="https://www.patreon.com/bePatron?u=880479">
    <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" height="40px" />
  </a>
</p>

Go ahead and use it: [rollcall.audio](https://rollcall.audio)

![demo gif](https://file-vpbygpmpka.now.sh)

Features Include:

* Multi-party realtime audio calls.
* Drag & Drop File Sharing.
* Podcast quality recording.
  * We record each participant locally and send you the audio via the
    data channel instead of recording the compressed and often low quality
    realtime audio.

For more information on how to use Roll Call check out the
[FAQ](https://rollcall.audio/faq.html).

Roll Call is entirely Open Source and can be embedded into your own web pages
and web applications.

## Chrome/Brave Only

**Roll Call only works in last few releases of
Chrome & Brave**. This is not due to lack of testing or development work but
because of bugs in Safari and Firefox. Roll Call sits at the intersection of
browser audio and WebRTC support, it's a minefield for finding bugs burried
deep in browser implementations. Even supporting Chrome takes [some hacks](https://github.com/mikeal/waudio/blob/master/index.js#L9).


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
