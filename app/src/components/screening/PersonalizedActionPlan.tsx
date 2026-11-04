'use client';

import { useState } from 'react';
import {
  Utensils,
  Dumbbell,
  ShoppingCart,
  Moon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Flame,
  Scale,
  Heart,
  Droplets,
  Calendar,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { ScreeningResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PersonalizedActionPlanProps {
  result: ScreeningResult;
}

interface Meal {
  name: string;
  desc: string;
  calories: number;
  carbs: number;
  gi: 'low' | 'medium';
}

interface DailyPlan {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
}

const SEVEN_DAY_MEALS: DailyPlan[] = [
  {
    day: 'Day 1 (Monday)',
    breakfast: {
      name: 'Steel-Cut Oats & Crushed Walnuts',
      desc: 'Cooked in unsweetened almond milk with ground cinnamon and chia seeds.',
      calories: 320,
      carbs: 28,
      gi: 'low',
    },
    lunch: {
      name: 'Mediterranean Grilled Chicken Salad',
      desc: 'Mixed greens, cucumber, kalamata olives, cherry tomatoes with extra virgin olive oil.',
      calories: 430,
      carbs: 12,
      gi: 'low',
    },
    dinner: {
      name: 'Baked Atlantic Salmon & Steamed Broccoli',
      desc: 'Wild-caught salmon seasoned with garlic and lemon; side of quinoa.',
      calories: 520,
      carbs: 22,
      gi: 'low',
    },
    snack: {
      name: 'Greek Yogurt with Blueberries',
      desc: '0% plain Greek yogurt with antioxidant-rich fresh blueberries.',
      calories: 140,
      carbs: 11,
      gi: 'low',
    },
  },
  {
    day: 'Day 2 (Tuesday)',
    breakfast: {
      name: 'Spinach & Feta Egg White Omelet',
      desc: 'Prepared with olive oil spray, fresh baby spinach, low-fat feta, and 1 slice sprouted grain toast.',
      calories: 290,
      carbs: 16,
      gi: 'low',
    },
    lunch: {
      name: 'Lentil & Vegetable Power Bowl',
      desc: 'Warm brown lentils, roasted zucchini, bell peppers, baby kale, and lemon-tahini dressing.',
      calories: 460,
      carbs: 38,
      gi: 'low',
    },
    dinner: {
      name: 'Herb-Roasted Turkey Breast & Asparagus',
      desc: 'Lean roasted turkey with garlic-roasted asparagus spears and cauliflower mash.',
      calories: 480,
      carbs: 14,
      gi: 'low',
    },
    snack: {
      name: 'Raw Almonds & Celery Sticks',
      desc: 'Handful of unsalted raw almonds with crisp celery sticks.',
      calories: 160,
      carbs: 6,
      gi: 'low',
    },
  },
  {
    day: 'Day 3 (Wednesday)',
    breakfast: {
      name: 'Avocado & Hemp Seed Toast',
      desc: 'Mashed Hass avocado on Ezekiel sprouted toast topped with hemp hearts and microgreens.',
      calories: 310,
      carbs: 22,
      gi: 'low',
    },
    lunch: {
      name: 'Wild Tuna & White Bean Salad',
      desc: 'Chunk light tuna packed in water tossed with cannellini beans, red onion, and parsley vinaigrette.',
      calories: 410,
      carbs: 24,
      gi: 'low',
    },
    dinner: {
      name: 'Stir-Fried Tofu with Asian Greens',
      desc: 'Firm tofu cubes wok-tossed with bok choy, snap peas, ginger, and tamari over cauliflower rice.',
      calories: 440,
      carbs: 18,
      gi: 'low',
    },
    snack: {
      name: 'Hard-Boiled Egg with Paprika',
      desc: 'Organic pasture-raised egg with sea salt and smoked paprika.',
      calories: 78,
      carbs: 1,
      gi: 'low',
    },
  },
  {
    day: 'Day 4 (Thursday)',
    breakfast: {
      name: 'Berry Chia Protein Pudding',
      desc: 'Overnight chia seeds in soy milk with plant protein powder and crushed blackberries.',
      calories: 330,
      carbs: 19,
      gi: 'low',
    },
    lunch: {
      name: 'Roasted Chickpea & Avocado Wrap',
      desc: 'Spiced chickpeas, crisp romaine, and guacamole wrapped in a high-fiber low-carb tortilla.',
      calories: 420,
      carbs: 32,
      gi: 'low',
    },
    dinner: {
      name: 'Lemon-Herb Cod Fillet & Green Beans',
      desc: 'Pan-seared cod fillet served with sauteed French green beans and slivered almonds.',
      calories: 460,
      carbs: 12,
      gi: 'low',
    },
    snack: {
      name: 'Roasted Pumpkin Seeds (Pepitas)',
      desc: 'Zinc- and magnesium-rich roasted pumpkin seeds with pink salt.',
      calories: 150,
      carbs: 5,
      gi: 'low',
    },
  },
  {
    day: 'Day 5 (Friday)',
    breakfast: {
      name: 'Fluffy Scrambled Eggs & Sliced Tomato',
      desc: 'Two whole eggs scrambled with chives, served with ripe heirloom tomatoes and cracked pepper.',
      calories: 270,
      carbs: 7,
      gi: 'low',
    },
    lunch: {
      name: 'Grilled Vegetable & Quinoa Bowl',
      desc: 'Tricolor quinoa, grilled eggplant, zucchini, bell peppers, and crushed pine nuts with balsamic.',
      calories: 450,
      carbs: 34,
      gi: 'low',
    },
    dinner: {
      name: 'Lean Beef Sirloin & Portobello Mushroom',
      desc: 'Grass-fed lean sirloin steak paired with grilled balsamic portobello mushrooms and arugula.',
      calories: 510,
      carbs: 9,
      gi: 'low',
    },
    snack: {
      name: 'Cottage Cheese with Flax Seeds',
      desc: 'Low-sodium 2% cottage cheese sprinkled with golden milled flaxseed.',
      calories: 130,
      carbs: 4,
      gi: 'low',
    },
  },
  {
    day: 'Day 6 (Saturday)',
    breakfast: {
      name: 'Warm Buckwheat Porridge with Pecans',
      desc: 'Gluten-free buckwheat groats simmered with almond milk, topped with toasted pecan halves.',
      calories: 340,
      carbs: 30,
      gi: 'low',
    },
    lunch: {
      name: 'Turkey, Cucumber & Hummus Roll-Ups',
      desc: 'Sliced roasted turkey layered with roasted red pepper hummus and crisp cucumber spears.',
      calories: 390,
      carbs: 14,
      gi: 'low',
    },
    dinner: {
      name: 'Moroccan Spiced Halibut & Ratatouille',
      desc: 'Halibut fillet seasoned with cumin, coriander, and turmeric, served over braised summer vegetables.',
      calories: 480,
      carbs: 16,
      gi: 'low',
    },
    snack: {
      name: 'Walnut & 85% Dark Chocolate Square',
      desc: 'Three walnut halves paired with one square of antioxidant-rich 85% cacao.',
      calories: 140,
      carbs: 7,
      gi: 'low',
    },
  },
  {
    day: 'Day 7 (Sunday)',
    breakfast: {
      name: 'Mediterranean Shakshuka with Poached Eggs',
      desc: 'Eggs poached in a spiced tomato, sweet pepper, and onion sauce with fresh cilantro.',
      calories: 320,
      carbs: 18,
      gi: 'low',
    },
    lunch: {
      name: 'Kale, Salmon & Edamame Salad Bowl',
      desc: 'Massaged lacinato kale, flaked canned wild salmon, shelled edamame, and tahini vinaigrette.',
      calories: 470,
      carbs: 16,
      gi: 'low',
    },
    dinner: {
      name: 'Slow-Cooked Rosemary Herb Chicken Thighs',
      desc: 'Skinless chicken thighs braised with rosemary, garlic, carrots, and sweet bell peppers.',
      calories: 490,
      carbs: 15,
      gi: 'low',
    },
    snack: {
      name: 'Apple Slices with Natural Peanut Butter',
      desc: 'Half a crisp green Granny Smith apple with 1 tbsp no-sugar-added peanut butter.',
      calories: 150,
      carbs: 14,
      gi: 'low',
    },
  },
];

const GROCERY_CATEGORIES = [
  {
    category: 'Leafy Greens & High-Fiber Produce',
    items: [
      { name: 'Baby Spinach & Lacinato Kale', benefit: 'Magnesium-rich; reduces postprandial glucose surges' },
      { name: 'Broccoli & Cauliflower', benefit: 'Sulforaphane helps improve hepatic insulin sensitivity' },
      { name: 'Cucumbers, Zucchini & Celery', benefit: 'Hydrating, low caloric density, near-zero net carbs' },
      { name: 'Fresh Blueberries / Blackberries', benefit: 'Polyphenols improve glucose uptake into skeletal muscle' },
    ],
  },
  {
    category: 'Lean Proteins & Omega-3s',
    items: [
      { name: 'Wild-Caught Salmon / Sardines', benefit: 'EPA/DHA lowers serum triglycerides and arterial inflammation' },
      { name: 'Organic Pasture-Raised Eggs', benefit: 'Zero carbohydrate, high leucine for muscle mass preservation' },
      { name: 'Skinless Turkey / Chicken Breast', benefit: 'Lean amino acids to support glycemic homeostasis' },
      { name: 'Firm Tofu / Organic Tempeh', benefit: 'Plant isoflavones positively modulate lipid balance' },
    ],
  },
  {
    category: 'Complex Low-GI Carbohydrates',
    items: [
      { name: 'Steel-Cut Oats (Unrefined)', benefit: 'Beta-glucan forms a viscous intestinal gel slowing glucose diffusion' },
      { name: 'Brown / Green Lentils', benefit: 'High resistant starch; feeds butyrate-producing gut microbiota' },
      { name: 'Quinoa & Buckwheat', benefit: 'Complete amino acid profile with low glycemic index (< 53)' },
      { name: 'Ezekiel Sprouted Grain Bread', benefit: 'Higher bioavailability, low insulin spike compared to white flour' },
    ],
  },
  {
    category: 'Healthy Fats, Seeds & Flavoring',
    items: [
      { name: 'Extra Virgin Olive Oil (Cold-Pressed)', benefit: 'Oleic acid improves endothelial function and insulin sensitivity' },
      { name: 'Raw Walnuts & Almonds', benefit: 'Monounsaturated fats blunt postprandial glycemic excursions' },
      { name: 'Milled Golden Flaxseed & Chia Seeds', benefit: 'Soluble mucilage fiber promotes satiety and lowers LDL' },
      { name: 'Ceylon Cinnamon & Apple Cider Vinegar', benefit: 'Shown in randomized trials to lower fasting blood sugar by 5-10%' },
    ],
  },
];

export function PersonalizedActionPlan({ result }: PersonalizedActionPlanProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [checkedGroceries, setCheckedGroceries] = useState<Record<string, boolean>>({});

  const glucoseValue = result.input.glucose_mg_dl ?? 100;
  const isPrediabeticOrHigher = result.risk_category === 'medium' || result.risk_category === 'high' || result.risk_category === 'very_high';
  const hasElevatedBp = (result.input.sbp ?? 120) >= 130 || (result.input.dbp ?? 80) >= 80;
  const bmiVal =
    result.input.height_cm && result.input.weight_kg
      ? result.input.weight_kg / Math.pow(result.input.height_cm / 100, 2)
      : 24;
  const isOverweight = bmiVal >= 25;

  const currentDay = SEVEN_DAY_MEALS[selectedDayIndex];
  const totalDailyCalories = currentDay.breakfast.calories + currentDay.lunch.calories + currentDay.dinner.calories + currentDay.snack.calories;
  const totalDailyCarbs = currentDay.breakfast.carbs + currentDay.lunch.carbs + currentDay.dinner.carbs + currentDay.snack.carbs;

  function toggleGrocery(name: string) {
    setCheckedGroceries((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-emerald-500/5 to-transparent pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Utensils className="h-4 w-4" />
              </span>
              <CardTitle className="text-xl font-bold">Personalized Clinical Action Plan</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Tailored Medical Nutrition Therapy (MNT) & lifestyle prescription calibrated to your metabolic biomarkers.
            </CardDescription>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1.5 py-1">
            <Sparkles className="h-3.5 w-3.5" /> ADA 2026 Protocols
          </Badge>
        </div>

        {/* Personalized Clinical Target Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4">
          <div className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-blue-500" /> Carb Budget</span>
              <span className="font-semibold text-foreground">{isPrediabeticOrHigher ? '< 40g / meal' : '< 55g / meal'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {isPrediabeticOrHigher ? 'Low-glycemic index (< 55). Limits post-meal insulin spikes.' : 'Focus on complex carbohydrates & whole grains.'}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-rose-500" /> Sodium & BP</span>
              <span className="font-semibold text-foreground">{hasElevatedBp ? '< 1,500 mg / day' : '< 2,300 mg / day'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {hasElevatedBp ? 'DASH protocol. Potassium-rich foods to lower vascular stiffness.' : 'Standard optimal cardiovascular maintenance range.'}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5 text-amber-500" /> Weight & Energy</span>
              <span className="font-semibold text-foreground">{isOverweight ? '500 kcal Deficit' : 'Isocaloric Maintenance'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {isOverweight ? '5-7% total weight reduction reduces type 2 conversion by 58%.' : 'Focus on muscle preservation and steady energy balance.'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        <Tabs defaultValue="meal-plan" className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-10 p-1 bg-muted/60">
            <TabsTrigger value="meal-plan" className="text-xs sm:text-sm gap-1.5">
              <Calendar className="h-3.5 w-3.5 hidden sm:inline" /> 7-Day Plan
            </TabsTrigger>
            <TabsTrigger value="exercise" className="text-xs sm:text-sm gap-1.5">
              <Dumbbell className="h-3.5 w-3.5 hidden sm:inline" /> Exercise
            </TabsTrigger>
            <TabsTrigger value="groceries" className="text-xs sm:text-sm gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 hidden sm:inline" /> Grocery List
            </TabsTrigger>
            <TabsTrigger value="habits" className="text-xs sm:text-sm gap-1.5">
              <Moon className="h-3.5 w-3.5 hidden sm:inline" /> Habits & Sleep
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: 7-DAY MEAL PLAN */}
          <TabsContent value="meal-plan" className="space-y-4 pt-4">
            {/* Day Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SEVEN_DAY_MEALS.map((m, idx) => (
                <button
                  key={m.day}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
                    selectedDayIndex === idx
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted border-border/70 text-muted-foreground'
                  )}
                >
                  {m.day.split(' ')[0]} {m.day.split(' ')[1]}
                </button>
              ))}
            </div>

            {/* Daily Calorie & Carb Snapshot Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 border p-3">
              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>{currentDay.day}</span>
                <Badge variant="outline" className="text-[11px] font-normal border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                  100% Low-GI Ingredients
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  <strong>{totalDailyCalories}</strong> kcal
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  <strong>{totalDailyCarbs}g</strong> Net Carbs
                </span>
              </div>
            </div>

            {/* Meals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Breakfast */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-background space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Breakfast</span>
                  <span className="text-xs text-muted-foreground font-medium">{currentDay.breakfast.calories} kcal · {currentDay.breakfast.carbs}g carbs</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{currentDay.breakfast.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentDay.breakfast.desc}</p>
              </div>

              {/* Lunch */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-background space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Lunch</span>
                  <span className="text-xs text-muted-foreground font-medium">{currentDay.lunch.calories} kcal · {currentDay.lunch.carbs}g carbs</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{currentDay.lunch.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentDay.lunch.desc}</p>
              </div>

              {/* Dinner */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-background space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Dinner</span>
                  <span className="text-xs text-muted-foreground font-medium">{currentDay.dinner.calories} kcal · {currentDay.dinner.carbs}g carbs</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{currentDay.dinner.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentDay.dinner.desc}</p>
              </div>

              {/* Low-GI Snack */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-background space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Smart Snack</span>
                  <span className="text-xs text-muted-foreground font-medium">{currentDay.snack.calories} kcal · {currentDay.snack.carbs}g carbs</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{currentDay.snack.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentDay.snack.desc}</p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: EXERCISE PRESCRIPTION */}
          <TabsContent value="exercise" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <h4 className="font-bold text-sm sm:text-base">ADA Exercise Prescription: 150 min / week</h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Physical exercise triggers muscle contraction-mediated GLUT4 translocation, allowing skeletal muscle cells to absorb circulating glucose independent of insulin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-4 space-y-2 bg-background">
                <div className="text-xs font-bold uppercase text-primary">1. Post-Meal Walks</div>
                <h5 className="font-semibold text-sm">15 Minutes After Meals</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Walking for 10-15 minutes immediately after lunch and dinner blunts the glucose spike peak by up to 34% compared to remaining sedentary.
                </p>
              </div>

              <div className="rounded-xl border p-4 space-y-2 bg-background">
                <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">2. Zone 2 Aerobic</div>
                <h5 className="font-semibold text-sm">30 Mins, 4x Weekly</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Brisk walking, cycling, or swimming at an intensity where you can comfortably speak in full sentences. Enhances mitochondrial density.
                </p>
              </div>

              <div className="rounded-xl border p-4 space-y-2 bg-background">
                <div className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">3. Resistance Training</div>
                <h5 className="font-semibold text-sm">2–3x Weekly Full Body</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bodyweight squats, push-ups, resistance bands, or dumbbell lunges. Muscle tissue acts as the largest glucose reservoir in the human body.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: GROCERY CHECKLIST */}
          <TabsContent value="groceries" className="space-y-4 pt-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">
                Tap items to check them off as you shop at the supermarket:
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
                onClick={() => setCheckedGroceries({})}
              >
                Clear checked
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GROCERY_CATEGORIES.map((cat) => (
                <div key={cat.category} className="rounded-xl border p-3.5 bg-background space-y-2.5">
                  <h4 className="text-xs font-bold text-foreground border-b pb-1.5">{cat.category}</h4>
                  <div className="space-y-2">
                    {cat.items.map((item) => {
                      const isChecked = checkedGroceries[item.name];
                      return (
                        <div
                          key={item.name}
                          onClick={() => toggleGrocery(item.name)}
                          className={cn(
                            'flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors',
                            isChecked ? 'bg-primary/5 text-muted-foreground line-through opacity-70' : 'hover:bg-muted/40'
                          )}
                        >
                          <div className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors',
                            isChecked ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background'
                          )}>
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 text-xs">
                            <span className="font-semibold block">{item.name}</span>
                            <span className="text-[11px] text-muted-foreground">{item.benefit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: HABITS & SLEEP */}
          <TabsContent value="habits" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl border p-4 bg-background space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  <Moon className="h-4 w-4" /> 7–8 Hours Quality Rest
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Single nights of short sleep (less than 6 hours) induce acute peripheral insulin resistance and elevate early morning cortisol, driving higher dawn fasting glucose readings.
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-background space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Hydration Before Meals
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drink 500 mL of water 15 minutes prior to main meals. Helps suppress circulating vasopressin and naturally regulates gastric emptying rate.
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-background space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" /> Avoid Liquid Sugars & Syrups
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sodas, sweetened teas, and fruit juices bypass satiety regulation and deliver concentrated fructose directly to the liver, fueling de novo lipogenesis.
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-background space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Sparkles className="h-4 w-4" /> Food Order Sequencing
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Eat vegetables and proteins <strong>first</strong>, and save carbohydrates for the <strong>end</strong> of the meal. This reduces postprandial glucose peaks by up to 50%.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
