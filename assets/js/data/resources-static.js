/**
 * resources-static.js | ONE Group Tools
 * Static resource ID → name mapping for instant zero-latency rendering.
 * kind = numeric resource ID used across all SimCompanies APIs.
 * Updated from HAR captures 2026-03-28 + SimCoTools resource list.
 */
export const RESOURCES_SNAPSHOT = [
  // IDs confirmed from market-ticker HAR (kind field):
  { id: 1,   kind: 1,   name: "Power",           image: "images/resources/power.png",            category: "Energy" },
  { id: 2,   kind: 2,   name: "Water",            image: "images/resources/water.png",            category: "Resources" },
  { id: 3,   kind: 3,   name: "Apples",           image: "images/resources/apples.png",           category: "Agriculture" },
  { id: 4,   kind: 4,   name: "Oranges",          image: "images/resources/oranges.png",          category: "Agriculture" },
  { id: 5,   kind: 5,   name: "Grapes",           image: "images/resources/grapes.png",           category: "Agriculture" },
  { id: 6,   kind: 6,   name: "Grain",            image: "images/resources/grain.png",            category: "Agriculture" },
  { id: 7,   kind: 7,   name: "Sugarcane",        image: "images/resources/sugarcane.png",        category: "Agriculture" },
  { id: 8,   kind: 8,   name: "Seeds",            image: "images/resources/seeds.png",            category: "Agriculture" },
  { id: 9,   kind: 9,   name: "Cocoa beans",      image: "images/resources/cocoa-beans.png",      category: "Agriculture" },
  { id: 10,  kind: 10,  name: "Crude oil",        image: "images/resources/crude-oil.png",        category: "Mining" },
  { id: 11,  kind: 11,  name: "Wood",             image: "images/resources/wood.png",             category: "Forestry" },
  { id: 12,  kind: 12,  name: "Transport",        image: "images/resources/transport.png",        category: "Resources" },
  { id: 13,  kind: 13,  name: "Transport",        image: "images/resources/transport.png",        category: "Resources" },
  { id: 14,  kind: 14,  name: "Iron ore",         image: "images/resources/iron-ore.png",         category: "Mining" },
  { id: 15,  kind: 15,  name: "Bauxite",          image: "images/resources/bauxite.png",          category: "Mining" },
  { id: 16,  kind: 16,  name: "Sand",             image: "images/resources/sand.png",             category: "Mining" },
  { id: 17,  kind: 17,  name: "Steel",            image: "images/resources/steel.png",            category: "Metallurgy" },
  { id: 18,  kind: 18,  name: "Aluminium",        image: "images/resources/aluminium.png",        category: "Metallurgy" },
  { id: 19,  kind: 19,  name: "Petrol",           image: "images/resources/petrol.png",           category: "Energy" },
  { id: 20,  kind: 20,  name: "Diesel",           image: "images/resources/diesel.png",           category: "Energy" },
  { id: 21,  kind: 21,  name: "Plastic",          image: "images/resources/plastic.png",          category: "Chemicals" },
  { id: 22,  kind: 22,  name: "Rubber",           image: "images/resources/rubber.png",           category: "Chemicals" },
  { id: 23,  kind: 23,  name: "Chemicals",        image: "images/resources/chemicals.png",        category: "Chemicals" },
  { id: 24,  kind: 24,  name: "Glass",            image: "images/resources/glass.png",            category: "Manufacturing" },
  { id: 25,  kind: 25,  name: "Electronic components", image: "images/resources/electronic-components.png", category: "Electronics" },
  { id: 26,  kind: 26,  name: "Processor",        image: "images/resources/processor.png",        category: "Electronics" },
  { id: 27,  kind: 27,  name: "Reinforced concrete", image: "images/resources/reinforced-concrete.png", category: "Construction" },
  { id: 28,  kind: 28,  name: "Bricks",           image: "images/resources/bricks.png",           category: "Construction" },
  { id: 29,  kind: 29,  name: "Planks",           image: "images/resources/planks.png",           category: "Construction" },
  { id: 30,  kind: 30,  name: "Construction units", image: "images/resources/construction-units.png", category: "Construction" },
  { id: 31,  kind: 31,  name: "Leather",          image: "images/resources/leather.png",          category: "Fashion" },
  { id: 32,  kind: 32,  name: "Fabric",           image: "images/resources/fabric.png",           category: "Fashion" },
  { id: 33,  kind: 33,  name: "Milk",             image: "images/resources/milk.png",             category: "Agriculture" },
  { id: 34,  kind: 34,  name: "Eggs",             image: "images/resources/eggs.png",             category: "Agriculture" },
  { id: 35,  kind: 35,  name: "Software",         image: "images/resources/software.png",         category: "Electronics" },
  { id: 36,  kind: 36,  name: "Research",         image: "images/resources/research.png",         category: "Research" },
  { id: 43,  kind: 43,  name: "Steel",            image: "images/resources/steel.png",            category: "Metallurgy" },
  { id: 44,  kind: 44,  name: "Sand",             image: "images/resources/sand.png",             category: "Mining" },
  { id: 45,  kind: 45,  name: "Glass",            image: "images/resources/glass.png",            category: "Manufacturing" },
  { id: 53,  kind: 53,  name: "Flour",            image: "images/resources/flour.png",            category: "Food" },
  { id: 58,  kind: 58,  name: "Automotive research", image: "images/resources/automotive-research.png", category: "Research" },
  { id: 63,  kind: 63,  name: "Vegetables",       image: "images/resources/vegetables.png",       category: "Agriculture" },
  { id: 72,  kind: 72,  name: "Sugarcane",        image: "images/resources/sugarcane.png",        category: "Agriculture" },
  { id: 79,  kind: 79,  name: "High-grade e-components", image: "images/resources/high-grade-e-components.png", category: "Electronics" },
  { id: 86,  kind: 86,  name: "Car body",         image: "images/resources/car-body.png",         category: "Automotive" },
  { id: 87,  kind: 87,  name: "Luxury car",       image: "images/resources/luxury-car.png",       category: "Automotive" },
  { id: 88,  kind: 88,  name: "Ion drive",        image: "images/resources/ion-drive.png",        category: "Aerospace" },
  { id: 102, kind: 102, name: "Bricks",           image: "images/resources/bricks.png",           category: "Construction" },
  { id: 103, kind: 103,  name: "Cement",           image: "images/resources/cement.png",           category: "Construction" },
  { id: 104,  kind: 104,  name: "Clay",             image: "images/resources/clay.png",             category: "Mining" },
  { id: 107, kind: 107,  name: "Rocket engine",    image: "images/resources/rocket-engine.png",    category: "Aerospace" },
  { id: 109,  kind: 109,  name: "BFR",              image: "images/resources/BFR.png",              category: "Aerospace" },
  { id: 110,  kind: 110,  name: "Jumbo jet",        image: "images/resources/jumbojet2.png",        category: "Aerospace" },
  { id: 111,  kind: 111,  name: "Private jet",      image: "images/resources/private-jet.png",      category: "Aerospace" },
  { id: 112,  kind: 112,  name: "Sub-orbital rocket", image: "images/resources/sub-orbital-rocket2.png", category: "Aerospace" },
  { id: 122,  kind: 122,  name: "Tablets",          image: "images/resources/tablets.png",          category: "Electronics" },
  { id: 132,  kind: 132,  name: "BFR",              image: "images/resources/BFR.png",              category: "Aerospace" },
  { id: 135,  kind: 135,  name: "Sugar",            image: "images/resources/sugar.png",            category: "Food" },
];

// NOTE: This list is from HAR captures and is INCOMPLETE.
// The full list (~142 resources) should be fetched from:
//   GET https://api.simcotools.com/v1/realms/0/resources
// and merged into this file periodically.

export const KIND_TO_NAME = new Map(RESOURCES_SNAPSHOT.map(r => [r.kind, r.name]));
export const NAME_TO_KIND = new Map(RESOURCES_SNAPSHOT.map(r => [r.name.toLowerCase(), r.kind]));
export const KIND_TO_IMAGE = new Map(RESOURCES_SNAPSHOT.map(r => [r.kind, r.image]));
