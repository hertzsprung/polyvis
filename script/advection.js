function uniformDomain(width, divisions) {
  var dx = width/divisions;

  var simulation = {
    width: width,
    divisions: divisions, // FIXME: remove this when properly non-uniform
    frames: [{nt:0, t:0, T: []}]
  };

  var T = simulation.frames[0].T;

  for (var i=0; i < divisions; i++) {
    T.push({x: i*dx+dx/2});
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

function simulate(simulation, interpolator, endTime, dt, u) {
  simulation.interpolator = interpolator;

  var dx = simulation.width / simulation.divisions; // FIXME: this will disappear with properly nonuniform grid
  var t = dt;
  simulation.Co = u * dt / dx;

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
    T[i] = { x: T_old[i].x, y: T_old[i].y - simulation.Co * (
        flux(T_old, i, i-2, i+1, simulation) - 
        flux(T_old, i-1, i-3, i, simulation))};
  }

  return T;
}

function flux(T, upwindOriginIndex, start, end, simulation) {
  var stencil = [];
  for (var i=start; i <= end; i++) {
    stencil.push(access(T, i));
  }
  stencil = localise(stencil, upwindOriginIndex-start, simulation.width);
  weights = [1e3, 1e3, 1, 1];
  return numeric.dot(values(stencil), fit(stencil, simulation.interpolator, weights).coefficients);
}

function localise(T, upwindOriginIndex, width) {
  var leftmost = T[0].x;
  
  for (var i=1; i < T.length; i++) {
    if (T[i].x < leftmost) {
      T[i] = { x: T[i].x + width, y: T[i].y };
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

function access(T, i) {
  return T[mod(i, T.length)];
}

function mod(a, b) {
  return ((a%b)+b)%b;
}
