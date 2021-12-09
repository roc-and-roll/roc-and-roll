// Grammar written in the peggy format: https://github.com/peggyjs/peggy
//
// Test the grammar here:
// https://peggyjs.org/online.html

Expression
  = head:Term tail:(_ ("+" / "-") _ Term)* {
      return tail.reduce(function(result, element) {
        const operator = element[1];
        return {
          type: 'term',
          operator,
          operands: result.type === 'term' && result.operator === operator
          	? [...result.operands, element[3]]
            : [result, element[3]]
        };
      }, head);
    }

Term
  = head:Factor tail:(_ ("*" / "×" / "/" / "÷") _ Factor)* {
      return tail.reduce(function(result, element) {
        const operator = element[1] === "×"
            ? "*"
            : element[1] === "÷"
            ? "/"
            : element[1];

        return {
          type: 'term',
          operator,
          operands: result.type === 'term' && result.operator === operator
          	? [...result.operands, element[3]]
            : [result, element[3]]
        };
      }, head);
    }

Factor
  = Parens
  / Dice
  / Num
  / Negated

Parens
  = "(" _ expr:Expression _ ")" {
  	return {
      type: 'parens',
      inner: expr,
    };
  }

Dice
  = _ countDigits:([0-9]+)? modifierChar:([dai]) faces:([0-9]+) _ {
    const count = countDigits === null ? 1 : parseInt(countDigits.join(''), 10);
    const modified = {
      	d: 'none',
        a: 'advantage',
        i: 'disadvantage',
      }[modifierChar];

    return {
      type: 'dice',
      count: count === 1 && modified !== "none" ? 2 : count,
      results: 'not-yet-rolled',
      modified,
      faces: parseInt(faces.join(''), 10),
      damage: {
        type: null,
      },
    };
  }

Num
  = (_ "+")? _ [0-9]+("."[0-9]+)? _ {
    return {
  	  type: 'num',
      value: parseFloat(text(), 10),
      damage: {
        type: null,
      },
  	};
  }

Negated
  = sign:("-" _) factor:Factor {
  	return {
      type: 'negated',
      inner: factor,
    }
  }

_ "whitespace"
  = [ \t\n\r]*
