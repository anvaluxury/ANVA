export type Lang = 'hy' | 'ru' | 'en'

export const LANGS: Lang[] = ['hy', 'ru', 'en']

export const DEFAULT_LANG: Lang = 'hy'

const dict = {
  hy: {
    login: 'Մուտք',
    register: 'Գրանցում',
    email_phone: 'Էլեկտրոնային հասցե',
    password: 'Գաղտնաբառ',

    confirm: 'Կրկնել գաղտնաբառը',
    full_name: 'Անուն Ազգանուն',
    remember: 'Հիշել ինձ',
    forgot: 'Մոռացե՞լ եք գաղտնաբառը',

    or: 'կամ',
    google: 'Շարունակել Google-ով',
    show: 'Ցույց տալ գաղտնաբառը',
    hide: 'Թաքցնել գաղտնաբառը',

    create: 'Ստեղծել հաշիվ',

    reset_sent: 'Վերականգնման հղումն ուղարկվել է Ձեր էլ. հասցեին:',
    reset_need_email: 'Մուտքագրեք էլ. հասցեն՝ գաղտնաբառը վերականգնելու համար:',

    err_required: 'Լրացրեք բոլոր դաշտերը:',
    err_email: 'Սխալ էլ. հասցե:',
    err_pw_short: 'Գաղտնաբառը պետք է լինի առնվազն 8 նիշ:',
    err_pw_match: 'Գաղտնաբառերը չեն համընկնում:',
    err_invalid: 'Սխալ էլ. հասցե կամ գաղտնաբառ:',

    err_network: 'Կապի սխալ. փորձեք կրկին:',
    err_config: 'Supabase-ը կարգավորված չէ (.env):',

    err_google: 'Google մուտքը կարգավորված չէ Supabase-ում:',

    ok_register: 'Գրանցումը կատարվեց: Ստուգեք էլ. փոստը՝ հաշիվը հաստատելու համար:',

    loading: 'Սպասեք…',
    tagline: 'LUXURY ONLINE SHOP',
    lang: 'Լեզու',
    first_name: 'Անուն',
    last_name: 'Ազգանուն',
    phone: 'Հեռախոսահամար',
    err_first: 'Մուտքագրեք անունը:',
    err_last: 'Մուտքագրեք ազգանունը:',
    err_phone: 'Մուտքագրեք հեռախոսահամարը միջազգային ձևաչափով, օրինակ՝ +374 77 000000:',
    err_exists: 'Այս էլ. հասցեով հաշիվ արդեն կա: Փորձեք մուտք գործել:',
    err_signup: 'Գրանցումը չհաջողվեց: Ստուգեք տվյալները և փորձեք կրկին:',
    pw_hint: 'Առնվազն 8 նիշ',
    login_sub: 'Բարի վերադարձ ANVA LUXURY:',
    register_sub: 'Ստեղծեք հաշիվ՝ ընտրյալները և կարծիքները պահելու համար:',
    ok_login: 'Դուք մուտք եք գործել:',
    continue_store: 'Շարունակել դեպի խանութ',
    back_home: 'Գլխավոր էջ',
    check_mail: 'Ստուգեք փոստը',
  },

  ru: {
    login: 'Вход',
    register: 'Регистрация',
    email_phone: 'Электронная почта',
    password: 'Пароль',

    confirm: 'Повторите пароль',
    full_name: 'Имя и фамилия',
    remember: 'Запомнить меня',
    forgot: 'Забыли пароль?',

    or: 'или',
    google: 'Продолжить через Google',
    show: 'Показать пароль',
    hide: 'Скрыть пароль',

    create: 'Создать аккаунт',

    reset_sent: 'Ссылка для восстановления отправлена на вашу почту.',
    reset_need_email: 'Введите эл. почту, чтобы восстановить пароль.',

    err_required: 'Заполните все поля.',
    err_email: 'Неверный адрес эл. почты.',
    err_pw_short: 'Пароль должен содержать минимум 8 символов.',
    err_pw_match: 'Пароли не совпадают.',
    err_invalid: 'Неверная почта или пароль.',

    err_network: 'Ошибка сети. Попробуйте ещё раз.',
    err_config: 'Supabase не настроен (.env).',

    err_google: 'Вход через Google не настроен в Supabase.',

    ok_register: 'Регистрация выполнена. Проверьте почту для подтверждения.',

    loading: 'Подождите…',
    tagline: 'LUXURY ONLINE SHOP',
    lang: 'Язык',
    first_name: 'Имя',
    last_name: 'Фамилия',
    phone: 'Номер телефона',
    err_first: 'Введите имя.',
    err_last: 'Введите фамилию.',
    err_phone: 'Введите телефон в международном формате, например +374 77 000000.',
    err_exists: 'Аккаунт с этой почтой уже существует. Попробуйте войти.',
    err_signup: 'Не удалось зарегистрироваться. Проверьте данные и повторите попытку.',
    pw_hint: 'Не менее 8 символов',
    login_sub: 'С возвращением в ANVA LUXURY.',
    register_sub: 'Создайте аккаунт, чтобы сохранять избранное и отзывы.',
    ok_login: 'Вы вошли в аккаунт.',
    continue_store: 'Перейти в магазин',
    back_home: 'На главную',
    check_mail: 'Проверьте почту',
  },

  en: {
    login: 'Login',
    register: 'Register',
    email_phone: 'Email address',
    password: 'Password',

    confirm: 'Confirm password',
    full_name: 'Full name',
    remember: 'Remember me',
    forgot: 'Forgot password?',

    or: 'or',
    google: 'Continue with Google',
    show: 'Show password',
    hide: 'Hide password',

    create: 'Create account',

    reset_sent: 'A reset link has been sent to your email.',
    reset_need_email: 'Enter your email to reset your password.',

    err_required: 'Please fill in all fields.',
    err_email: 'Invalid email address.',
    err_pw_short: 'Password must be at least 8 characters.',
    err_pw_match: 'Passwords do not match.',
    err_invalid: 'Invalid email or password.',

    err_network: 'Network error. Please try again.',
    err_config: 'Supabase is not configured (.env).',

    err_google: 'Google sign-in is not configured in Supabase.',

    ok_register: 'Registered. Check your email to confirm the account.',

    loading: 'Please wait…',
    tagline: 'LUXURY ONLINE SHOP',
    lang: 'Language',
    first_name: 'First name',
    last_name: 'Last name',
    phone: 'Phone number',
    err_first: 'Enter your first name.',
    err_last: 'Enter your last name.',
    err_phone: 'Enter your phone in international format, e.g. +374 77 000000.',
    err_exists: 'An account with this email already exists. Try signing in.',
    err_signup: 'Registration failed. Check your details and try again.',
    pw_hint: 'At least 8 characters',
    login_sub: 'Welcome back to ANVA LUXURY.',
    register_sub: 'Create an account to keep your favorites and reviews.',
    ok_login: 'You are signed in.',
    continue_store: 'Continue to the store',
    back_home: 'Back to home',
    check_mail: 'Check your email',
  },
} as const

export type Key = keyof typeof dict.en

export const t = (lang: Lang, k: Key): string =>
  dict[lang][k] ?? dict.en[k]

export const isLang = (v?: string): v is Lang =>
  !!v && (LANGS as string[]).includes(v)