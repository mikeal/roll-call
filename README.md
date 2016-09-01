# PeerCall



## To Develop

Download the code and run `npm install`.

If you want to do development on the Electron app run.

```bash
npm start
```

Two electron apps will launch in a test room pulling from that same mic which is muted.

If you want to debug the web interface run.

```bash
npm run web
```

## URL structure

Because this is a single-page static application all actions are embedded in
querystrings.

### ?call=:id

Where `id` is the identifier of the `current` user.

If a user opens this URL it will ask for their information and the *call* the
user embedded in the URL. Once the call is established the url will pushState
to the new calling user's call URL.

In effect, the *call* url is like a phone number for the current user. Anyone
in an active call can take *their* url and give it to another user, that user
will then call that user and they can add them to the call which will begin
sharing the signalling information of the other users on the call.

