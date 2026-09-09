import test from 'node:test';
import assert from 'node:assert/strict';
import { elapsedTogether, plural, START } from '../src/counter.js';

test('start and dates before start do not show negative time',()=>{
  const zero={months:0,days:0,hours:0,minutes:0,seconds:0};
  assert.deepEqual(elapsedTogether(START),zero);assert.deepEqual(elapsedTogether(START-1),zero);
});
test('calendar month is February 13 to March 13, not thirty days',()=>{
  assert.deepEqual(elapsedTogether(Date.parse('2026-03-13T23:46:22+08:00')),{months:1,days:0,hours:0,minutes:0,seconds:0});
  assert.deepEqual(elapsedTogether(Date.parse('2026-03-13T23:46:21+08:00')),{months:0,days:27,hours:23,minutes:59,seconds:59});
});
test('long months, year transitions and leap day are correct',()=>{
  assert.deepEqual(elapsedTogether(Date.parse('2027-02-13T23:46:22+08:00')),{months:12,days:0,hours:0,minutes:0,seconds:0});
  assert.deepEqual(elapsedTogether(Date.parse('2028-03-13T23:46:22+08:00')),{months:25,days:0,hours:0,minutes:0,seconds:0});
  assert.deepEqual(elapsedTogether(Date.parse('2026-05-13T23:46:21+08:00')),{months:2,days:29,hours:23,minutes:59,seconds:59});
});
test('equivalent instants have identical counters in different time zones',()=>{
  assert.deepEqual(elapsedTogether(Date.parse('2026-09-10T03:58:00+08:00')),elapsedTogether(Date.parse('2026-09-09T19:58:00Z')));
});
test('Russian labels handle singular, teens and plural',()=>{
  const f=['месяц','месяца','месяцев'];
  for(const [n,expected]of [[1,'месяц'],[2,'месяца'],[11,'месяцев'],[14,'месяцев'],[21,'месяц'],[24,'месяца'],[25,'месяцев']])assert.equal(plural(n,f),expected);
});
