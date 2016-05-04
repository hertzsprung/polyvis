T = []
N = 16
dx = 2*Math.PI/N

for (var i=0; i < N; i++) {
  x = i*dx+dx/2
  T.push({x: x})
}

k = 2

for (var i=0; i < N; i++) {
  T[i].y = Math.sin(k*T[i].x);
}
