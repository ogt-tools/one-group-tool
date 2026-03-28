/**
 * buildings.js | ONE Group Tools
 * Static reference: Building name → products it can produce
 * Source: SimCompanies Encyclopedia (verified per game as of 2026)
 * v1.0.0
 */

export const BUILDING_PRODUCTS = {
  "Farm":                 ["Grain", "Seeds", "Cotton", "Apples", "Oranges", "Grapes",
                           "Cocoa beans", "Coffee beans", "Sugarcane"],
  "Ranch":                ["Milk", "Eggs", "Cattle", "Pigs", "Sheep", "Hides"],
  "Plantation":           ["Wood", "Natural rubber", "Silk"],
  "Quarry":               ["Sand", "Clay", "Limestone", "Silicon"],
  "Mine":                 ["Iron ore", "Bauxite", "Gold ore", "Minerals", "Coal"],
  "Oil Rig":              ["Crude oil"],
  "Water Reservoir":      ["Water"],
  "Power Plant":          ["Power"],
  "Factory":              ["Construction units", "Planks", "Bricks", "Reinforced concrete",
                           "Glass", "Steel"],
  "Refinery":             ["Petrol", "Diesel", "Plastic", "Carbon fibers"],
  "Electronics Factory":  ["Processor", "Electronic components", "Battery", "Display",
                           "Microchip"],
  "Fashion Factory":      ["Leather", "Fabric", "Gloves", "Dress", "Shoes",
                           "Jewelry", "Handbag"],
  "Food Factory":         ["Flour", "Sugar", "Chocolate", "Coffee", "Bread",
                           "Cheese", "Ham", "Wine", "Beer", "Vodka",
                           "Ketchup", "Juice"],
  "Chemical Plant":       ["Chemicals", "Paint", "Fertilizer", "Synthetic rubber",
                           "Explosives"],
  "Automotive Factory":   ["Cars", "Trucks", "Motorcycles"],
  "Aerospace Factory":    ["Jumbo jet", "BFR", "Single engine plane", "Space shuttle"],
  "Propulsion Factory":   ["Rocket engine", "Jet engine", "Piston engine"],
  "Robotics Factory":     ["Robot", "Drone"],
  "Research Lab":         ["Research"],
  "Sales Office":         [], // Retail building — no production
  "Grocery":              [],
  "Restaurant":           [],
  "Clothing Store":       [],
  "Car Dealership":       [],
  "Electronics Store":    []
};

// Building categories for filtering
export const BUILDING_CATEGORIES = {
  "Agriculture":    ["Farm", "Ranch", "Plantation", "Water Reservoir"],
  "Extraction":     ["Quarry", "Mine", "Oil Rig"],
  "Energy":         ["Power Plant"],
  "Manufacturing":  ["Factory", "Refinery", "Electronics Factory", "Fashion Factory",
                     "Food Factory", "Chemical Plant", "Automotive Factory",
                     "Aerospace Factory", "Propulsion Factory", "Robotics Factory"],
  "Research":       ["Research Lab"],
  "Retail":         ["Sales Office", "Grocery", "Restaurant", "Clothing Store",
                     "Car Dealership", "Electronics Store"]
};
