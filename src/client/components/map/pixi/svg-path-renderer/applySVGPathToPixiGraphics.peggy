// Grammar written in the peggy format: https://github.com/peggyjs/peggy
//
// Test the grammar here:
// https://peggyjs.org/online.html

/*!
 * cspell:disable
 *
 * @license This grammar is based on the grammar from section 9.3.9 of the
 * Scalable Vector Graphics (SVG) 2 W3C Candidate Recommendation 04 October 2018
 * https://www.w3.org/TR/2018/CR-SVG2-20181004/paths.html#PathDataBNF
 *
 * Copyright © 2015 W3C® (MIT, ERCIM, Keio, Beihang).
 * This software or document includes material copied from or derived from
 * Scalable Vector Graphics (SVG) 2.
 * https://www.w3.org/Consortium/Legal/2015/doc-license
 *
 * cspell:enable
 */

// The grammar in the W3C candidate recommendation is slightly wrong; we use a
// fixed version that was proposed here:
// https://github.com/w3c/svgwg/issues/752#issuecomment-555971317

svg_path
  = wsp* (moveto (wsp* command)*)? wsp* {
  }

command
  = moveto
    / closepath
    / lineto
    / horizontal_lineto
    / vertical_lineto
    / curveto
    / smooth_curveto
    / quadratic_bezier_curveto
    / smooth_quadratic_bezier_curveto
    / elliptical_arc

moveto
  = c:( "M" / "m" ) wsp* to:coordinate_pair_sequence {
    options.handler.moveTo(c, to);
  }

closepath
  = ("Z" / "z") {
    options.handler.closePath();
  }

lineto
  = c:("L" / "l") wsp* pp:coordinate_pair_sequence {
    options.handler.lineTo(c, pp);
  }

horizontal_lineto
  = c:("H" / "h") wsp* pp:coordinate_sequence {
    options.handler.horizontalLineTo(c, pp);
  }

vertical_lineto
  = c:("V" / "v") wsp* pp:coordinate_sequence {
    options.handler.verticalLineTo(c, pp);
  }

curveto
  = c:("C" / "c") wsp* pp:curveto_coordinate_sequence {
    options.handler.cubicCurveTo(c, pp);
  }

curveto_coordinate_sequence
  = t:coordinate_pair_triplet comma_wsp? tt:curveto_coordinate_sequence {
    return [t, ...tt];
  }
  / t:coordinate_pair_triplet {
    return [t];
  }

smooth_curveto
  = c:("S" / "s") wsp* pp:smooth_curveto_coordinate_sequence {
    options.handler.smoothCubicCurveTo(c, pp);
  }

smooth_curveto_coordinate_sequence
  = c:coordinate_pair_double comma_wsp? cc:smooth_curveto_coordinate_sequence {
    return [c, ...cc];
  }
  / c:coordinate_pair_double {
    return [c];
  }

quadratic_bezier_curveto
  = c:("Q" / "q") wsp* pp:quadratic_bezier_curveto_coordinate_sequence {
    options.handler.quadraticCurveTo(c, pp);
  }

quadratic_bezier_curveto_coordinate_sequence
  = c:coordinate_pair_double comma_wsp? cc:quadratic_bezier_curveto_coordinate_sequence {
    return [c, ...cc];
  }
  / coordinate_pair_double {
    return [c];
  }

smooth_quadratic_bezier_curveto
  = c:("T" / "t") wsp* pp:coordinate_pair_sequence {
    options.handler.smoothQuadraticCurveTo(c, pp);
  }

elliptical_arc
  = c:( "A" / "a" ) wsp* pp:elliptical_arc_argument_sequence {
    options.handler.ellipticalArc(c, pp);
  }

elliptical_arc_argument_sequence
  = a:elliptical_arc_argument comma_wsp? aa:elliptical_arc_argument_sequence {
    return [a, ...aa];
  }
  / a:elliptical_arc_argument {
    return [a];
  }

elliptical_arc_argument
  = a:number comma_wsp? b:number comma_wsp? c:number comma_wsp d:flag comma_wsp? e:flag comma_wsp? f:coordinate_pair {
    return [a, b, c, d, e, f];
  }

coordinate_pair_double
  = a:coordinate_pair comma_wsp? b:coordinate_pair {
    return [a, b];
  }

coordinate_pair_triplet
  = a:coordinate_pair comma_wsp? b:coordinate_pair comma_wsp? c:coordinate_pair {
    return [a, b, c];
  }

coordinate_pair_sequence
  = p:coordinate_pair comma_wsp? pp:coordinate_pair_sequence {
    return [p, ...pp];
  }
  / p:coordinate_pair {
    return [p];
  }

coordinate_sequence
  = c:coordinate comma_wsp? cc:coordinate_sequence {
    return [c, ...cc];
  }
  / c:coordinate {
    return [c];
  }

coordinate_pair
  = x:coordinate comma_wsp? y:coordinate {
    return { x, y };
  }

coordinate
  = sign:sign? number:number {
    return (sign ?? 1) * number;
  }

sign
  = "+" / "-" {
    return text() === '+' ? 1 : -1;
  }
// The grammar (wrongly) lists only digits here, but we also need to support
// floating point numbers.
number
  = ([0-9])+ "." ([0-9])+ {
    return parseFloat(text());
  }
  / ([0-9])+ "."? {
    return parseFloat(text());
  }
  / "."? ([0-9])+ {
    return parseFloat(text());
  }
flag
  = ("0" / "1") {
    return parseInt(text());
  }
comma_wsp
  = (wsp+ ","? wsp*)
  / ("," wsp*)
wsp
  = ("\x09" / "\x20" / "\x0A" / "\x0C" / "\x0D")