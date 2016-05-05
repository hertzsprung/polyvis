function uniformDomain(width, divisions) {
  var dx = width/divisions;

  var simulation = {
    width: width,
    faces: [],
    frames: [{nt:0, t:0, T: []}]
  };

  var faces = simulation.faces;

  for (var i=0; i < divisions+1; i++) {
    faces.push(i*dx);
  }

  return calculateCellCentres(simulation);
}

function calculateCellCentres(simulation) {
  var T = simulation.frames[0].T;
  T.length = 0;
  var faces = simulation.faces;

  for (var i=0; i < faces.length - 1; i++) {
    T.push({x: 0.5*(faces[i] + faces[i+1])});
  }

  return simulation;
}

function sineWave(simulation, k) {
  k *= 2*Math.PI;

  var T = simulation.frames[0].T;

  for (var i=0; i < T.length; i++) {
    T[i].y = Math.sin(k*T[i].x);
  }

  return simulation;
}

function hat(simulation) {
  var T = simulation.frames[0].T;

  for (var i=0; i < T.length; i++) {
    T[i].y = (T[i].x < 0.5) ? 0 : 1;
  }

  return simulation;
}

function simulate(simulation, interpolator, endTime, dt, u) {
  simulation.interpolator = interpolator;
  simulation.u = u;
  simulation.dt = dt;
  simulation.maxCourant = maxCourant(simulation);

  var t = dt;

  for (var nt=1; t < endTime+dt; nt+=1, t+=dt) {
    var T_old = simulation.frames[nt-1].T;

    var T = forwardStep(simulation);

    simulation.frames.push({nt:nt, t:t, T: T});
  }

  return simulation;
}

function forwardStep(simulation) {
  var T_old = simulation.frames[simulation.frames.length - 1].T;
  var T = T_old.slice();

  for (var i=0; i < T.length; i++) {

    T[i] = { x: T_old[i].x, y: T_old[i].y - courant(simulation, i) * (
        flux(T_old, i, i-2, i+1, simulation) - 
        flux(T_old, i-1, i-3, i, simulation))};
  }

  return T;
}

function maxCourant(simulation) {
  var T = simulation.frames[0].T;
  var max = 0;

  for (var i=0; i < T.length; i++) {
    var c = courant(simulation, i);
    if (c > max) max = c;
  }

  return max;
}

function courant(simulation, i) {
    var dx = simulation.faces[i+1] - simulation.faces[i];
    return simulation.u * simulation.dt / dx;
}

function flux(T, upwindOriginIndex, start, end, simulation) {
  var stencil = [];
  for (var i=start; i <= end; i++) {
    stencil.push(access(T, i));
  }
  stencil = localise(stencil, start, upwindOriginIndex, simulation);
  weights = [1e3, 1e3, 1, 1];
  return numeric.dot(values(stencil), fit(stencil, simulation.interpolator, weights).coefficients);
}

function localise(T, startIndex, upwindOriginIndex, simulation) {
  var leftmost = T[0].x;
  
  for (var i=1; i < T.length; i++) {
    if (T[i].x < leftmost) {
      T[i] = { x: T[i].x + simulation.width, y: T[i].y };
    }
  }

  var localUpwindOriginIndex = upwindOriginIndex - startIndex;
  var upwind = T[localUpwindOriginIndex].x;
  var face = simulation.faces[upwindOriginIndex+1];
  if (face < upwind) face += simulation.width;
  var scale = face - upwind;

  // stencil order: upwind, downwind, peripheral points
  var stencil = [];
  stencil.push(T[localUpwindOriginIndex]);
  stencil.push(T[localUpwindOriginIndex+1]);

  for (var i=0; i < T.length; i++) {
    if (i != localUpwindOriginIndex && i != localUpwindOriginIndex+1) {
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

function access(T, i) {
  return T[mod(i, T.length)];
}

function mod(a, b) {
  return ((a%b)+b)%b;
}
