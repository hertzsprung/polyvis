function fit(points, polynomial) {
  var B = matrix(points, polynomial);
  var Binv = pinv(B);

  var yVector = [];
  for (var j = 0; j < points.length; j++) {
    yVector.push(points[j].y);
  }

  var coefficients = numeric.dot(Binv, yVector)
  return function(x) {
    var y = 0;
    for (term = 0; term < polynomial.length; term++) {
      y += coefficients[term] * polynomial[term](x);
    }
    return y;
  };
}

function matrix(points, polynomial) {
  var B = [];
  for (var row = 0; row < points.length; row++) {
    B.push([]);
    for (var col = 0; col < polynomial.length; col++) {
      B[row].push(polynomial[col](points[row].x)); 
    }
  }
  return B;
}

function cubic() {
  return [
    function(x) { return 1.0; },
    function(x) { return x; },
    function(x) { return Math.pow(x, 2); },
    function(x) { return Math.pow(x, 3); }
  ];
}

function pinv(A) {
  var z = numeric.svd(A), foo = z.S[0];
  var U = z.U, S = z.S, V = z.V;
  var m = A.length, n = A[0].length, tol = Math.max(m,n)*numeric.epsilon*foo,M = S.length;
  var i,Sinv = new Array(M);
  for(i=M-1;i!==-1;i--) { if(S[i]>tol) Sinv[i] = 1/S[i]; else Sinv[i] = 0; }
  return numeric.dot(numeric.dot(V,numeric.diag(Sinv)),numeric.transpose(U))
}
