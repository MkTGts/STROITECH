import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Политика конфиденциальности</h1>
            <p className="mt-1 text-muted-foreground">
              Объекты.online — как мы обрабатываем ваши данные
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Дата последнего обновления: {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="mt-10 space-y-8 text-muted-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">1. Общие положения</h2>
            <p className="leading-relaxed">
              Настоящая политика конфиденциальности определяет порядок обработки и защиты персональных данных
              пользователей сервиса Объекты.online (далее — «Сервис»). Используя Сервис, вы соглашаетесь с
              условиями данной политики. Мы собираем только те данные, которые необходимы для работы площадки,
              оказания услуг и улучшения качества Сервиса.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">2. Какие данные мы собираем</h2>
            <p className="mb-3 leading-relaxed">
              При регистрации и использовании Сервиса мы можем обрабатывать:
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>адрес электронной почты и номер телефона;</li>
              <li>имя (или название компании) и роль на площадке (заказчик, поставщик, строитель, техника);</li>
              <li>пароль в зашифрованном виде (мы не храним пароли в открытом виде);</li>
              <li>описание профиля, регион, аватар — по вашему желанию;</li>
              <li>содержание объявлений, объектов строительства и переписки в чате;</li>
              <li>технические данные: IP-адрес, тип браузера, данные о входе в аккаунт — для безопасности и работы Сервиса.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">3. Цели обработки данных</h2>
            <p className="leading-relaxed">
              Мы используем персональные данные для: создания и ведения учётной записи; отображения вашего
              профиля, объявлений и объектов другим пользователям в соответствии с настройками видимости;
              организации чата и уведомлений; обеспечения безопасности и предотвращения злоупотреблений;
              связи с вами по вопросам Сервиса; улучшения работы сайта и сервисов (в обезличенном виде, где
              применимо). Мы не передаём ваши персональные данные третьим лицам для рекламы или маркетинга
              без вашего согласия.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">4. Размещение данных на площадке</h2>
            <p className="leading-relaxed">
              Информация, которую вы указываете в объявлениях, объектах строительства и в профиле, может быть
              видна другим пользователям Сервиса в соответствии с правилами видимости (например, карточки
              объявлений и объектов доступны авторизованным пользователям). Не размещайте в открытом доступе
              данные, которые не хотите раскрывать. Переписка в чате доступна только участникам диалога.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">5. Хранение и защита данных</h2>
            <p className="leading-relaxed">
              Мы храним персональные данные на защищённых серверах в течение срока, необходимого для
              оказания услуг и выполнения законодательных требований. Применяются технические и
              организационные меры для защиты от несанкционированного доступа, изменения или уничтожения
              данных. Доступ к персональным данным имеют только уполномоченные лица в объёме, необходимом
              для выполнения служебных задач.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">6. Файлы cookie и аналогичные технологии</h2>
            <p className="leading-relaxed">
              Сервис может использовать файлы cookie и локальное хранилище браузера для: сохранения сессии
              входа, настроек интерфейса и обеспечения работы чата и уведомлений. Эти данные не передаются
              третьим лицам для рекламных целей без вашего согласия. Отключение cookie может ограничить
              работу отдельных функций Сервиса.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">7. Ваши права</h2>
            <p className="leading-relaxed">
              Вы вправе запросить доступ к своим персональным данным, их уточнение, удаление или
              ограничение обработки в случаях, предусмотренных законом. Для этого можно обратиться в
              поддержку Сервиса. Удаление аккаунта может повлечь удаление или обезличивание связанных
              данных в соответствии с нашей внутренней процедурой и применимым законодательством.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">8. Изменение политики</h2>
            <p className="leading-relaxed">
              Мы можем обновлять настоящую политику конфиденциальности. О существенных изменениях мы
              уведомим через Сервис (например, сообщением при входе или по указанному вами email).
              Продолжение использования Сервиса после публикации изменений означает принятие обновлённой
              политики.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">9. Контакты</h2>
            <p className="leading-relaxed">
              По вопросам обработки персональных данных и данной политики вы можете обратиться через раздел{" "}
              <Link href="/contacts" className="font-medium text-primary hover:underline">
                Контакты
              </Link>{" "}
              или по указанным на сайте контактным данным оператора Сервиса.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/about">
            <Button variant="outline" className="gap-2">
              О нас
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/faq">
            <Button variant="outline" className="gap-2">
              Частые вопросы
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
