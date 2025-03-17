export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  orderId: string;
  firstName: string;
  lastName: string;
  grade: string;
  email: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  checkedIn: boolean;
  isPoly: boolean;
  prepaid: boolean;
  venmo: boolean;
  isAbsent: boolean;
  paymentMethod: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  nickname?: string;
  email?: string;
} 