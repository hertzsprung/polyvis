var T = [];
var L = 1;
var N = 16;
var dx = L/N;

for (var i=0; i < N; i++) {
  x = i*dx+dx/2;
  T.push({x: x});
}

var k = 8*2*Math.PI;

for (var i=0; i < N; i++) {
  T[i].y = Math.sin(k*T[i].x);
}

T_init = T.slice();
T_oldOld = T.slice();
T_old = T.slice();

var t = 0;
var dt = 0.01;
var endTime = 32;
var u = L / 32;
var Co = 2*u * dt / dx;
console.log("Courant", Co/2);

function forwardStep(interpolator) {
  for (var i=0; i < N; i++) {
    T[i] = { x: T_old[i].x, y: T_old[i].y - 0.5*Co * (flux(T_old, i, i-2, i+1, interpolator) - flux(T_old, i-1, i-3, i, interpolator))};
  }
  T_oldOld = T_old.slice();
  T_old = T.slice();
}

function leapfrogStep() {
  for (var i=0; i < N; i++) {
    T[i] = { x: T_old[i].x, y: T_oldOld[i].y - Co * (flux(T_old, i, i-2, i+1) - flux(T_old, i-1, i-3, i))};
  }
  T_oldOld = T_old.slice();
  T_old = T.slice();
}

function mod(a, b) {
  return ((a%b)+b)%b;
}

function access(T, i) {
  return T[mod(i, T.length)];
}

function flux(T, upwindOriginIndex, start, end, interpolator) {
  var stencil = [];
  for (var i=start; i <= end; i++) {
    stencil.push(access(T, i));
  }
  stencil = localise(stencil, upwindOriginIndex-start);
  weights = [1e3, 1e3, 1, 1];
  return numeric.dot(values(stencil), fit(stencil, interpolator, weights).coefficients);
}

function localise(T, upwindOriginIndex) {
  var leftmost = T[0].x;
  
  for (var i=1; i < T.length; i++) {
    if (T[i].x < leftmost) {
      T[i] = { x: T[i].x + L, y: T[i].y };
    }
  }

  var upwind = T[upwindOriginIndex].x;
  var downwind = T[upwindOriginIndex+1].x; // this should always be safe
  var face = 0.5*(upwind+downwind);
  var scale = face - upwind;

  // stencil order: upwind, downwind, peripheral points
  var stencil = [];
  stencil.push(T[upwindOriginIndex]);
  stencil.push(T[upwindOriginIndex+1]);

  for (var i=0; i < T.length; i++) {
    if (i != upwindOriginIndex && i != upwindOriginIndex+1) {
      stencil.push(T[i]);
    }
  }

  // rescale into local coordinates
  for (var i=0; i < T.length; i++) {
    stencil[i] = { x: (stencil[i].x - face)/scale, y: stencil[i].y };
  }

  return stencil;
}

function values(stencil) {
  var v = [];
  for (var i=0; i < stencil.length; i++) {
    v.push(stencil[i].y);
  }
  return v;
}
