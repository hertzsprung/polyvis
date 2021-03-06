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
  return simulation;
}

function sineWave(simulation, k) {
  simulation.generator = function(T) {
    k *= 2*Math.PI;

    for (var i=0; i < T.length; i++) {
      T[i].y = Math.sin(k*T[i].x);
    }
  };

  return simulation;
}

function oscillatory(simulation) {
  simulation.generator = function(T) {
    for (var i=0; i < T.length; i++) {
      T[i].y = 2 * (i % 2) - 1;
    }
  };

  return simulation;
}

function simulate(simulation, interpolator, endTime, dt, u) {
  simulation.interpolator = interpolator;
  simulation.u = u;
  simulation.dt = dt;

  calculateCellCentres(simulation);
  simulation.generator(simulation.frames[0].T);

  simulation.maxCourant = maxCourant(simulation);

  var t = dt;

  for (var nt=1; t < endTime+dt; nt+=1, t+=dt) {
    var T_old = simulation.frames[nt-1].T;

    var T = rk3Step(simulation);

    simulation.frames.push({nt:nt, t:t, T: T});
  }

  return simulation;
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

function forwardStep(simulation) {
  var T_old = simulation.frames[simulation.frames.length - 1].T;
  var T = T_old.slice();

  calculateFluxes(simulation, T_old);

  for (var i=0; i < T.length; i++) {
    T[i] = { 
      x: T_old[i].x,
      y: T_old[i].y - courant(simulation, i) * (T_old[i].fluxR.value - T_old[i].fluxL.value),
    };
  }

  return T;
}

function rk3Step(simulation) {
  var T_old = simulation.frames[simulation.frames.length - 1].T;
  var T = T_old.slice();

  calculateFluxes(simulation, T_old);

  for (var corr=0; corr < 3; corr++) {
    calculateFluxes(simulation, T);

    for (var i=0; i < T.length; i++) {
      var flux_old = T_old[i].fluxR.value - T_old[i].fluxL.value;
      var flux_new = T[i].fluxR.value - T[i].fluxL.value;

      T[i] = { 
        x: T_old[i].x,
        y: T_old[i].y - 0.5 * courant(simulation, i) * (flux_old + flux_new)
      };
    }
  }

  return T;
}

function calculateFluxes(simulation, T) {
  for (var i=0; i < T.length; i++) {
    T[i].fluxL = flux(T, i-1, i-3, i, simulation);
    T[i].fluxR = flux(T, i, i-2, i+1, simulation);
  }
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
  var polyFit = fit(stencil, simulation.interpolator, weights);

  return {
    value: numeric.dot(values(stencil), polyFit.coefficients),
    polynomial: polyFit.polynomial,
    stencil: stencil,
    coefficients: polyFit.coefficients
  };
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
