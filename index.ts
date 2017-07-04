import 'reflect-metadata';

type Ctor<T> = new(...args: any[]) => T;

type JSON = any;

class Result<I, A> {
  input: I;
  value: A;
}
type Parser<I, A> = (value: I) => Result<I, A>;

type JSONParser<A> = Parser<JSON, A>;
type JSONParser1 = JSONParser<any>;

const identity: JSONParser1 = (input) => ({ input, value: {} });
const assoc = (p1: JSONParser1, p2: JSONParser1): JSONParser1 =>
  (input: JSON) => {
    const fst = p1(input);
    const snd = p2(fst.input);
    return { input, value: { ...fst.value, ...snd.value } };
  };

let Parsers = new Map<Function, JSONParser1>();
function setParser<T>(ctor: Ctor<T>, parser: JSONParser<T>) {
  Parsers.set(ctor, parser);
}

setParser(Number, (input: JSON) => ({
  input,
  value: parseFloat(input)
}));

setParser(String, (input: JSON) => ({
  input,
  value: input
}));

const getParserFor = (type: Function) => Parsers.get(type);

const propParser = (from: string, to: string, type: Function): JSONParser1 =>
  (input: JSON) => {
    const parser = getParserFor(type);
    const result = parser(input[from]);
    return ({ input, value: { [to]: result.value } });
  };

// const propManyParser = (from: string, to: string, type: Function): JSONParser1 =>
//   (input: JSON) => {
//     const parser = getParserFor(type);
//     const values = input[from].map(parser);
//     return ({ input, value: { [to]: values } });
//   };

function Prop(fromName?: string) {
  return function (target: any, key: string) {
    const from = fromName || key;
    const to = key;
    const ctor = target.constructor;
    const parser = getParserFor(ctor) || identity;
    const type = Reflect.getMetadata('design:type', target, key);
    setParser(ctor, assoc(parser, propParser(from, to, type)));
  };
}

// function Many(subType: Function, fromName?: string) {
//   return function (target: any, key: string) {
//     const type = Reflect.getMetadata('design:type', target, key);
//     if (type !== Array) {
//       throw new Error('should be array');
//     }
//     debugger;
//   };
// }

function parse<T>(def: Ctor<T>, source: JSON): T {
  const parser = getParserFor(def);
  const result = parser(source);
  return result.value as T;
}

// repl
class Author {
  @Prop('Name') name: string;
}

class Entry {
  @Prop() id: number;
  @Prop('Title') title: string;
  @Prop('Author') author: Author;
}

const a: Entry = parse(Entry, {id: 123, Title: 'blop', Author: {Name: 'abc'}});
debugger;



