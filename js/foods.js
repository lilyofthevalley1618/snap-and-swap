// per 1 standard serving: kcal, protein, carbs, fat (g)
export const FOODS=[
['Cheeseburger',535,28,40,29],['French fries (medium)',365,4,48,17],['Pepperoni pizza slice',300,13,34,12],['Caesar salad',360,9,14,30],
['Grilled chicken breast',230,43,0,5],['White rice (1 cup)',205,4,45,0],['Brown rice (1 cup)',215,5,45,2],['Spaghetti bolognese',560,28,70,18],
['Turkey sandwich',380,24,40,12],['Greek yogurt (plain)',130,17,8,4],['Banana',105,1,27,0],['Apple',95,0,25,0],
['Oatmeal (1 cup)',165,6,28,4],['Scrambled eggs (2)',180,12,2,14],['Avocado toast',290,7,30,17],['Boba milk tea',350,2,62,10],
['Chicken teriyaki bowl',650,35,90,14],['Sushi roll (8 pc)',330,12,50,9],['Ramen (instant)',380,9,52,14],['Glazed donut',260,3,31,14],
['Soda (12 oz)',150,0,39,0],['Burrito',700,30,85,25],['Salmon fillet',350,34,0,22],['Mixed veggies (1 cup)',60,3,12,0]
].map(([name,kcal,p,c,f])=>({name,kcal,p,c,f}));
// Nutrition-forward swaps: add, not just cut.
export const SWAPS=[
[/fries/i,'Baked potato wedges','Same crunch, more potassium',150],
[/burger/i,'Grilled chicken burger with lettuce & tomato','More protein, extra veggies',180],
[/pizza/i,'Thin-crust veggie slice','Adds fiber and color',90],
[/caesar/i,'Salad with light vinaigrette + chicken','More protein, lighter dressing',140],
[/white rice/i,'Brown rice or half cauli-rice','More fiber keeps you full',40],
[/spaghetti/i,'Whole-wheat pasta, half portion + side salad','Fiber and veggies',170],
[/boba|milk tea/i,'Half-sugar milk tea, less boba','Same treat, less added sugar',140],
[/teriyaki/i,'Teriyaki bowl with extra veggies, half rice','More veggies and fiber',180],
[/ramen/i,'Ramen with egg + spinach, half the broth packet','Protein and greens, less sodium',80],
[/donut/i,'Whole-grain toast with peanut butter','Protein that lasts till lunch',60],
[/soda/i,'Sparkling water with fruit','Hydration without added sugar',150],
[/burrito/i,'Burrito bowl, no tortilla, extra beans','More fiber, same flavor',220],
];
export function swapFor(name){const s=SWAPS.find(([r])=>r.test(name));return s?{to:s[1],why:s[2],saves:s[3]}:null}
