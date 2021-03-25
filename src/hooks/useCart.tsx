import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');  //Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0; // Se já está no carrinho, é o amount dele, se não, 0
      const amount = currentAmount + 1; // quantidade desejada

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) {
        productExists.amount = amount; // Se já existe, adiciona + 1 no amount
      } else {
        const product = await api.get(`/products/${productId}`); // Recupera os dados do produto da api

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId); // Retorna -1, caso não encontre 

      if(productIndex >= 0) {
        updatedCart.splice(productIndex, 1); // Apaga o index que encontramos e, somente 1
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);                             // Faz a requisição da ID e do Stock de determinado produto

      const stockAmount = stock.data.amount;                                          // Armazena somente o ID desse produto

      if(amount > stockAmount) {                                                    // Verifica se a quantidade desejada é maior do que a em estoque
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];                                                // Cria um novo carrinho
      const productExists = updatedCart.find(product => product.id === productId); // Verifica se o produto desejado já está no carrinho

      if(productExists) {                                                          // Se ele existe no carrinho
        productExists.amount = amount;                                            // Adiciona +1 na quantidade
        setCart(updatedCart);                                                     // Faz o update do estado 
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));   // Faz o update no localStorage;
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
