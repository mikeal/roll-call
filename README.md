# Roll Call

[![Greenkeeper badge](https://badges.greenkeeper.io/mikeal/roll-call.svg)](https://greenkeeper.io/)

![demo gif](https://cdn-images-1.medium.com/max/600/1*PPYEQEBH_KFuifS0EEdazg.gif)

On the surface, **Roll Call is quite simple**. Free calls for everyone in the world.

Try it now at: [rollcall.audio](https://rollcall.audio)

---

With modern web technologies we should be able to make free audio calls to everyone in the world.
Since this technology is peer-to-peer, there should be little to no infrastructure cost.
That’s how it *should be*.

In reality, there isn’t a reliable project that accomplishes this. This problem also gets more complicated as we add some important additional requirements.

* People in countries that sanction censorship and block services should be able to access it reliably.
* Third parties (like Governments) should not be able to track users or listen to calls.
* Users should be able to record calls to produce new media like podcasts.

---

Admittedly, Roll Call doesn’t accomplish all of this today, but what it does do today:

* Reliable audio-only calls between multiple participants.
* Audio files can be dragged into the call window and played into the call. (This is super fun, you can see it work in the gif above, why have I never seen this before?)
* Call recording is built-in, with podcast quality recording of every participants local audio sent continuously to the recorder.
* Relies on almost no infrastructure, the application is quite literally hosted in [gh-pages on GitHub](https://github.com/mikeal/roll-call/tree/gh-pages).

---

Open Source **products** are quite rare, especially in modern open source. Many of the lessons I’ve learned about how to manage and scale open source may not apply, but I’m excited to see how this all turns out. Needless to say, I’ll be experimenting along the way with different approaches to governance and contribution policies that are participatory but also product centric.

If the goals of this project are interesting, take a look at what is being done and contribute!

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
