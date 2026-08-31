import { describe, expect, test } from 'bun:test';
import {
  isCurrentBachelorForSelection,
  parseCurrentBachelorMessage,
} from '../src/features/led/model/parse-current-bachelor-message';

describe('parseCurrentBachelorMessage', () => {
  test('parses CurrentBachelor Socket.IO messages emitted by NestJS', () => {
    const bachelor = parseCurrentBachelorMessage(
      'CurrentBachelor {"StudentCode":"SV001","FullName":"Nguyen Van A","Mail":"a@example.com","Major":"CNTT","Image":"/a.jpg","HallName":1,"SessionNum":2,"Chair":"A01","ChairParent":"P01"}'
    );

    expect(bachelor?.studentCode).toBe('SV001');
    expect(bachelor?.fullName).toBe('Nguyen Van A');
    expect(bachelor?.hallName).toBe('1');
    expect(bachelor?.sessionNum).toBe(2);
    expect(bachelor?.chair).toBe('A01');
    expect(bachelor && isCurrentBachelorForSelection(bachelor, '1', '2')).toBe(
      true
    );
  });

  test('ignores unrelated realtime messages', () => {
    expect(parseCurrentBachelorMessage('hello')).toBeNull();
  });
});
