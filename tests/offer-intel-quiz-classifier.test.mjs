import test from "node:test";
import assert from "node:assert/strict";
import { classifyStep } from "../lib/offer-intel-classifier.mjs";
test("Primal Viking captured title/path beats generic Shopify checkout/cart text",()=>{
  // Title and URLs read from the captured batch; theme text is an explicitly synthetic FAKE.
  const title="Take the Quiz & Get Your Primal Testosterone Routine";
  const text="Your cart Checkout Payment methods Shipping calculated at checkout Add to cart";
  const html='<script src="https://cdn.shopify.com/theme.js"></script><a href="/checkout">Checkout</a>';
  for(const url of ["https://primalviking.com/pages/emoji-quiz-reindeer-long","https://primalviking.com/pages/quiz-reindeer"]) {
    const result=classifyStep({url,title,text,html});
    assert.equal(result.kind,"quiz");assert.equal(result.verification,"verified");
    assert.deepEqual(result.classification_basis.signals,[{source:"document_title",rule:"quiz"}]);
  }
  const pathOnly=classifyStep({url:"https://example.com/pages/quiz-reindeer",text,html});
  assert.equal(pathOnly.kind,"quiz");assert.equal(pathOnly.verification,"inferred");
  assert.notEqual(classifyStep({title:"Welcome",text,html}).kind,"checkout");
  assert.equal(classifyStep({title:"Checkout",text:"Card number"}).kind,"checkout");
  assert.equal(classifyStep({title:"Take the Quiz",http_status:403}).verification,"inaccessible");
});
