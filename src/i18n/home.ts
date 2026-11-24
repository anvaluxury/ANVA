import { Lang } from './index'
const d = {
  hy: { home:'Գլխավոր', collections:'Հավաքածուներ', shop:'Խանութ', about:'Մեր մասին', journal:'Ամսագիր', contact:'Կապ', scroll:'Ոլորել', new:'ՆՈՐ', reviews:'կարծիք', order:'Պատվիրել', details:'Մանրամասներ',
    q:'Որակ', del:'Առաքում', empty:'Ապրանքները շուտով կավելանան։', quick:'Արագ հղումներ', care:'Հաճախորդների սպասարկում', follow:'Հետևեք մեզ', faq:'ՀՏՀ', ship:'Առաքում', ret:'Վերադարձ', email:'Ձեր էլ. հասցեն', sub:'Բաժանորդագրվել', sub_ok:'Շնորհակալություն, բաժանորդագրվեցիք։', sub_dup:'Այս հասցեն արդեն բաժանորդագրված է։', sub_err:'Սխալ էլ. հասցե կամ կապի խնդիր։', rights:'Բոլոր իրավունքները պաշտպանված են։', favorites:'Ընտրյալներ', account:'Հաշիվ', search:'Որոնում', amd:'֏' },
  ru: { home:'Главная', collections:'Коллекции', shop:'Магазин', about:'О нас', journal:'Журнал', contact:'Контакты', scroll:'Прокрутите', new:'НОВИНКА', reviews:'отзывов', order:'Заказать', details:'Подробнее',
    q:'Качество', del:'Доставка', empty:'Товары скоро появятся.', quick:'Быстрые ссылки', care:'Поддержка', follow:'Мы в соцсетях', faq:'FAQ', ship:'Доставка', ret:'Возврат', email:'Ваш e-mail', sub:'Подписаться', sub_ok:'Спасибо, вы подписаны.', sub_dup:'Этот адрес уже подписан.', sub_err:'Неверный e-mail или ошибка сети.', rights:'Все права защищены.', favorites:'Избранное', account:'Аккаунт', search:'Поиск', amd:'֏' },
  en: { home:'Home', collections:'Collections', shop:'Shop', about:'About', journal:'Journal', contact:'Contact', scroll:'Scroll Down', new:'NEW', reviews:'reviews', order:'Order via', details:'View Details',
    q:'Premium Quality', del:'Delivery', empty:'Products are coming soon.', quick:'Quick Links', care:'Customer Care', follow:'Follow Us', faq:'FAQ', ship:'Shipping', ret:'Returns', email:'Your email address', sub:'Subscribe', sub_ok:'Thank you, you are subscribed.', sub_dup:'This email is already subscribed.', sub_err:'Invalid email or network error.', rights:'All rights reserved.', favorites:'Favorites', account:'Account', search:'Search', amd:'AMD' },
} as const
export type HKey = keyof typeof d.en
export const h = (l: Lang, k: HKey): string => d[l][k]
