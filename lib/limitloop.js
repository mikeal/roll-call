/*

limitLoop.js - limit the frame-rate when using requestAnimation frame
Released under an MIT license.

When to use it?
----------------
A consistent frame-rate can be better than a janky experience only 
occasionally hitting 60fps. Use this trick to target a specific frame-
rate (e.g 30fps, 48fps) until browsers better tackle this problem 
natively.

Please ensure that if you're using this workaround, you've done your best
to find and optimize the performance bottlenecks in your application first.
60fps should be an attainable goal. If however you've tried your best and
are still not getting the desired frame-rate, see if you can get some mileage
with it.

This type of trick works better when you know you have a fixed amount
of work to be done and it will always take longer than 16.6ms. It doesn't
work as well when your workload is somewhat variable.


Solution
----------------

When we draw, deduct the last frame's execution time from the current 
time to see if the time elapsed since the last frame is more than the 
fps-based interval or not. Should the condition evaluate to true, set 
the time for the current frame which will be the last frame execution 
time in the next drawing call.

Prior art / inspiration
------------------------
http://cssdeck.com/labs/embed/gvxnxdrh/0/output
http://codetheory.in/controlling-the-frame-rate-with-requestanimationframe/
*/

var limitLoop = function (fn, fps) {
 
    // Use var then = Date.now(); if you
    // don't care about targetting < IE9
    var then = new Date().getTime();

    // custom fps, otherwise fallback to 60
    fps = fps || 60;
    var interval = 1000 / fps;
 
    return (function loop(time){
        requestAnimationFrame(loop);
 
        // again, Date.now() if it's available
        var now = new Date().getTime();
        var delta = now - then;
 
        if (delta > interval) {
            // Update time
            // now - (delta % interval) is an improvement over just 
            // using then = now, which can end up lowering overall fps
            then = now - (delta % interval);
 
            // call the fn
            fn();
        }
    }(0));
};
module.exports = limitLoop