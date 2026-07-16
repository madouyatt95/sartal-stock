import type {
  Product,
  RestaurantProductionStation,
  RestaurantServiceCourse
} from '../types';

export interface RestaurantProductRouting {
  station: RestaurantProductionStation;
  course: RestaurantServiceCourse;
  preparationMinutes: number;
}

export const RESTAURANT_STATION_LABELS: Record<RestaurantProductionStation, string> = {
  kitchen: 'Cuisine',
  drinks: 'Bar / boissons',
  dessert: 'Desserts'
};

export const RESTAURANT_COURSE_LABELS: Record<RestaurantServiceCourse, string> = {
  drinks: 'Boissons',
  starter: 'Entrées',
  main: 'Plats',
  dessert: 'Desserts'
};

export const inferRestaurantProductRouting = (
  product?: Pick<Product, 'name' | 'category' | 'restaurantStation' | 'restaurantCourse' | 'preparationMinutes'>
): RestaurantProductRouting => {
  const descriptor = `${product?.category || ''} ${product?.name || ''}`.toLowerCase();
  const inferredStation: RestaurantProductionStation = /boisson|jus|eau|café|cafe|thé|the|mocktail|soda|cola|tonic|sirop/i.test(descriptor)
    ? 'drinks'
    : /dessert|pâtisserie|patisserie|glace|fruit|thiakry/i.test(descriptor)
      ? 'dessert'
      : 'kitchen';
  const station = product?.restaurantStation || inferredStation;
  const inferredCourse: RestaurantServiceCourse = station === 'drinks'
    ? 'drinks'
    : station === 'dessert'
      ? 'dessert'
      : /entrée|entree|salade|soupe|tapas|samoussa/i.test(descriptor)
        ? 'starter'
        : 'main';
  const course = product?.restaurantCourse || inferredCourse;
  const defaultMinutes = station === 'drinks' ? 4 : station === 'dessert' ? 10 : course === 'starter' ? 12 : 18;

  return {
    station,
    course,
    preparationMinutes: Math.max(1, product?.preparationMinutes || defaultMinutes)
  };
};
