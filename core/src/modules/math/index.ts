import { defineModule, audit, isNumber, sum } from '@/lib';
import { BaseError, TemplateDataError, TemplateSyntaxError } from '@/errors';


// Types

export type Arg = string|number|null|undefined;

export type FlattenFuncArg = number | number[];

type MathOperation = {
    firstPath: string,
    secondPath: string,
    operation: string,
};


// Functions

export function op(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, op, b, ...rest ] = args;


    // Defining the functions

    const handle = (..._args: Arg[]): number => {
        const [ mathOp, ...mathArgs ] = _args;
        const handle = Math[mathOp] ?? null;

        if (handle)
            return handle(...mathArgs);
        else
            throw new TemplateSyntaxError('Math: Unknown operation: ' + audit(mathOp));
    }

    const flatten = (..._args: FlattenFuncArg[] | any[]): number[] => {
        const result: number[] = [];

        for (const arg of _args) {
            if (isNumber(arg))
                result.push(arg);
            else if (Array.isArray(arg) && arg.every(isNumber))
                result.push(...arg);
            else
                throw new BaseError('Math: Unable to sum: The given arguments are not numbers: ' + audit(_args));
        }

        return result;
    };


    // Applying the operation

    switch (op) {
        case 'plus':
        case 'sum':
            return sum(...flatten(a, b || 0, ...rest));
        case 'minus':
            return Number(a) - Number(b || 0);
        case 'multiply':
            return Number(a) * Number(b || 1);
        case 'divide':
            return Number(a) / Number(b || 1);
        case 'intDivide':
            return Number(a) % Number(b || 1);
        case 'power':
            return Number(a) ** Number(b || 1);
        default:
            return handle(...args);
    }
}

export function plus(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b, ...rest ] = args;

    return op({ ...state, args: [ a, 'plus', b, ...rest ] });
}

export function _sum(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b, ...rest ] = args;

    return op({ ...state, args: [ a, 'sum', b, ...rest ] });
}

export function minus(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b ] = args;

    return op({ ...state, args: [ a, 'minus', b ] });
}

export function operation(state: any): MathOperation {
    const args: any[] = state?.args ?? [];
    const [ firstPath, secondPath, itemOperation ] = args;

    if (typeof firstPath !== 'string' || typeof secondPath !== 'string' || typeof itemOperation !== 'string')
        throw new TemplateDataError('Math: Unable to create operation: Field paths and operation must be strings');

    return { firstPath, secondPath, operation: itemOperation };
}

function getFieldValue(item: any, path: string): any {
    let value = item;

    for (const part of path.split('.')) value = value?.[part];

    return value;
}

function applyBinaryOperation(first: number, itemOperation: string, second: number): number {
    switch (itemOperation) {
        case 'plus':
        case 'sum':
            return first + second;
        case 'minus':
            return first - second;
        case 'multiply':
        case 'mul':
            return first * second;
        case 'divide':
        case 'div':
            return first / second;
        default:
            throw new TemplateSyntaxError('Math: Unknown operation: ' + audit(itemOperation));
    }
}

function isBinaryOperation(operation: string): boolean {
    return [ 'plus', 'sum', 'minus', 'multiply', 'mul', 'divide', 'div' ].includes(operation);
}

function combineValues(values: number[], arrayOperation: string): number {
    if (arrayOperation === 'sum' || arrayOperation === 'plus') return sum(...values);
    if (values.length === 0) return 0;

    return values.slice(1).reduce((total, value) => applyBinaryOperation(total, arrayOperation, value), values[0]);
}

export function aggregate(state: any): number {
    const args: any[] = state?.args ?? [];
    const [ items, mathOperation, arrayOperation ] = args;

    if (!Array.isArray(items))
        throw new TemplateDataError('Math: Unable to aggregate: The given value is not an array: ' + audit(items));

    if (!mathOperation || typeof mathOperation !== 'object' || typeof arrayOperation !== 'string')
        throw new TemplateDataError('Math: Unable to aggregate: An item operation and array operation are required');

    const { firstPath, secondPath, operation: itemOperation } = mathOperation as MathOperation;

    if (!isBinaryOperation(itemOperation) || !isBinaryOperation(arrayOperation))
        throw new TemplateSyntaxError('Math: Unknown operation: ' + audit(!isBinaryOperation(itemOperation) ? itemOperation : arrayOperation));

    const values = items.map(item => {
        const first = getFieldValue(item, firstPath);
        const second = getFieldValue(item, secondPath);

        if (!isNumber(first) || !isNumber(second))
            throw new TemplateDataError('Math: Unable to aggregate: Field values must be numbers: ' + audit(item));

        return applyBinaryOperation(Number(first), itemOperation, Number(second));
    });

    return combineValues(values, arrayOperation);
}

export function multiply(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b ] = args;

    return op({ ...state, args: [ a, 'multiply', b ] });
}

export function divide(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b ] = args;

    return op({ ...state, args: [ a, 'divide', b ] });
}

export function intDivide(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b ] = args;

    return op({ ...state, args: [ a, 'intDivide', b ] });
}

export function power(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, b ] = args;

    return op({ ...state, args: [ a, 'power', b ] });
}

export function round(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a, _op ] = args;


    // Defining the function

    const handle = (__op: string, val: Arg): number => op({ ...state, args: [ __op, val ] });


    // If the operation is not defined

    if (!_op) return handle('round', a);


    // Applying the operation

    switch (_op) {
        case 'floor':
            return handle('floor', a);
        case 'ceil':
            return handle('ceil', a);
        case 'trunc':
            return handle('trunc', a);
        default:
            throw new TemplateSyntaxError('Math: Unknown operation: ' + audit(_op));
    }
}

export function sqrt(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a ] = args;

    return op({ ...state, args: [ 'sqrt', a ] });
}

export function cbrt(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a ] = args;

    return op({ ...state, args: [ 'cbrt', a ] });
}

export function abs(state: any): number {
    const args: Arg[] = state?.args ?? [];
    const [ a ] = args;

    return op({ ...state, args: [ 'abs', a ] });
}


export default defineModule({
    helpers: {
        op: op,
        plus: plus,
        sum: _sum,
        operation: operation,
        aggregate: aggregate,
        minus: minus,
        multiply: multiply,
        mul: multiply,
        divide: divide,
        div: divide,
        intDivide: intDivide,
        intDiv: intDivide,
        power: power,
        pow: power,
        round: round,
        sqrt: sqrt,
        cbrt: cbrt,
        abs: abs,
        __default: op,
    },
});
