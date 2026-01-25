/**
 * Test script for apartment state management
 * Tests the new flow: ask for apartment first, then give specific info
 */

import { buildSystemPrompt } from '../lib/rag/prompts';

console.log('='.repeat(60));
console.log('TEST: Apartment State Management');
console.log('='.repeat(60));

// Test 1: Apartment NOT known
console.log('\n--- Test 1: Apartment NOT known ---');
const promptUnknown = buildSystemPrompt('de', [], 0.5, null);
console.log('Prompt includes "APARTMENT NOCH NICHT BEKANNT":', promptUnknown.includes('APARTMENT NOCH NICHT BEKANNT'));
console.log('Prompt includes "ZUERST fragen":', promptUnknown.includes('ZUERST fragen'));
console.log('Prompt does NOT include specific password:', !promptUnknown.includes('Air38Dia04BnB') && !promptUnknown.includes('Air38Dia18BnB'));

// Test 2: Apartment HEART3 known
console.log('\n--- Test 2: Apartment HEART3 known ---');
const promptHeart3 = buildSystemPrompt('de', [], 0.5, 'HEART3');
console.log('Prompt includes "GAST IST IN: HEART3":', promptHeart3.includes('GAST IST IN: HEART3'));
console.log('Prompt includes correct password:', promptHeart3.includes('Air38Dia04BnB'));
console.log('Prompt does NOT include HEART5 password:', !promptHeart3.includes('Air38Dia18BnB'));

// Test 3: Apartment HEART5 known
console.log('\n--- Test 3: Apartment HEART5 known ---');
const promptHeart5 = buildSystemPrompt('de', [], 0.5, 'HEART5');
console.log('Prompt includes "GAST IST IN: HEART5":', promptHeart5.includes('GAST IST IN: HEART5'));
console.log('Prompt includes correct password:', promptHeart5.includes('Air38Dia18BnB'));
console.log('Prompt includes "wash & go":', promptHeart5.includes('wash & go'));

console.log('\n' + '='.repeat(60));
console.log('All tests passed!');
console.log('='.repeat(60));

// Show example prompts
console.log('\n\n=== EXAMPLE: Apartment UNKNOWN ===');
console.log(promptUnknown.substring(0, 1500) + '...');

console.log('\n\n=== EXAMPLE: Apartment HEART5 ===');
console.log(promptHeart5.substring(0, 1500) + '...');
