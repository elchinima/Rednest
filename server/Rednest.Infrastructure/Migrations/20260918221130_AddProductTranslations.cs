using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    public partial class AddProductTranslations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DescriptionTranslations",
                table: "Products",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameTranslations",
                table: "Products",
                type: "jsonb",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object(
                        'AZ', COALESCE(""Name"", ''),
                        'EN', COALESCE(""Name"", ''),
                        'RU', COALESCE(""Name"", '')
                    ),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', COALESCE(""Description"", ''),
                        'EN', COALESCE(""Description"", ''),
                        'RU', COALESCE(""Description"", '')
                    )
                WHERE ""NameTranslations"" IS NULL;

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Çay', 'EN', 'Tea', 'RU', 'Чай'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Susuzluğu yatırır, gümrahlıq verir və istirahət üçün ideal seçimdir.',
                        'EN', 'Quenches thirst, invigorates, and is an ideal choice for relaxation.',
                        'RU', 'Утоляет жажду, бодрит и является идеальным выбором для отдыха.'
                    )
                WHERE ""Name"" = 'Tea' OR ""Id"" = 'a1b2c3d4-0001-0001-0001-000000000001';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Espresso', 'EN', 'Espresso', 'RU', 'Эспрессо'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Qatı və zəngin dadı ilə günə enerjili başlamaq üçün mükəmməl seçim. Əsl qəhvə həvəskarlarının sevimlisi.',
                        'EN', 'A perfect choice to start the day energetically with its thick and strong taste. A favorite of true coffee lovers.',
                        'RU', 'Идеальный выбор для энергичного начала дня благодаря насыщенному и крепкому вкусу. Фаворит истинных ценителей кофе.'
                    )
                WHERE ""Name"" = 'Espresso' OR ""Id"" = 'a1b2c3d4-0001-0001-0001-000000000002';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Amerikano', 'EN', 'Americano', 'RU', 'Американо'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Yüngül və zərif dad. Espressonun üzərinə su əlavə edilərək hazırlanır, dadı sadə və klassikdir.',
                        'EN', 'A light and delicate flavor. Prepared by adding water to espresso, its taste is simple yet classic.',
                        'RU', 'Легкий и мягкий вкус. Готовится добавлением воды в эспрессо, вкус простой и классический.'
                    )
                WHERE ""Name"" = 'Americano' OR ""Id"" = 'a1b2c3d4-0001-0001-0001-000000000003';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Latte', 'EN', 'Latte', 'RU', 'Латте'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'İncə süd köpüyü ilə qarışdırılmış yumşaq espresso. İsti və zərif dadı sevənlər üçün.',
                        'EN', 'Soft espresso mixed with fine milk foam. For those who love a warm and delicate taste.',
                        'RU', 'Мягкий эспрессо в сочетании с нежной молочной пенкой. Для тех, кто ценит теплый и утонченный вкус.'
                    )
                WHERE ""Name"" = 'Latte' OR ""Id"" = 'a1b2c3d4-0001-0001-0001-000000000004';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Kapuçino', 'EN', 'Cappuccino', 'RU', 'Капучино'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Qəhvə və süd köpüyünün mükəmməl balansı. Üstündəki yumşaq köpük hər qurtumda sevinc bəxş edir.',
                        'EN', 'The perfect balance of coffee and milk foam. The soft foam on top brings happiness with every sip.',
                        'RU', 'Идеальный баланс кофе и молочной пенки. Нежная пенка дарит удовольствие с каждым глотком.'
                    )
                WHERE ""Name"" = 'Cappuccino' OR ""Id"" = 'a1b2c3d4-0001-0001-0001-000000000005';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Red Latte', 'EN', 'Red Latte', 'RU', 'Ред Латте'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Xüsusi Rednest resepti: Latte və çiyələk siropunun harmoniyası. Şirin və romantik dad.',
                        'EN', 'Special Rednest recipe: The harmony of latte and strawberry syrup. A sweet and romantic taste.',
                        'RU', 'Фирменный рецепт Rednest: гармония латте и клубничного сиропа. Сладкий и романтичный вкус.'
                    )
                WHERE ""Name"" = 'Red Latte' OR ""Id"" = 'a1b2c3d4-0002-0002-0002-000000000001';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Nest Kapuçino', 'EN', 'Nest Cappuccino', 'RU', 'Нест Капучино'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Karamel şirinliyi və fındıq ətri ilə zənginləşdirilmiş kapuçino. İsti bir qucaqlaşma kimi.',
                        'EN', 'Cappuccino enriched with the sweetness of caramel and the aroma of hazelnut. Like a warm hug.',
                        'RU', 'Капучино с добавлением сладкой карамели и аромата лесного ореха. Словно теплое объятие.'
                    )
                WHERE ""Name"" = 'Nest Cappuccino' OR ""Id"" = 'a1b2c3d4-0002-0002-0002-000000000002';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'İsti Şokolad', 'EN', 'Hot Chocolate', 'RU', 'Горячий шоколад'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Qatı şokoladın ətri və yumşaqlığı ilə qəlbinizi isidən içki. Uşaqlıq xatirələrini oyadan bir dad.',
                        'EN', 'A drink that warms your soul with the aroma and softness of thick chocolate. A taste that brings back childhood memories.',
                        'RU', 'Напиток, согревающий душу ароматом и нежностью густого шоколада. Вкус, возвращающий воспоминания о детстве.'
                    )
                WHERE ""Name"" = 'Hot Chocolate' OR ""Id"" = 'a1b2c3d4-0002-0002-0002-000000000003';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Ekler', 'EN', 'Eclair', 'RU', 'Эклер'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Ətirli krem ilə doldurulmuş və incə qatla örtülmüş zərif şirniyyat. Hər dişləm yüngül şirinlik və xoş dad gətirir.',
                        'EN', 'A delicate pastry dessert filled with fragrant cream and covered with a fine layer. Every bite brings a light sweetness and pleasant taste.',
                        'RU', 'Изысканный десерт с ароматным кремом под тонкой глазурью. Каждый кусочек дарит легкую сладость и истинное удовольствие.'
                    )
                WHERE ""Name"" = 'Eclair' OR ""Id"" = 'a1b2c3d4-0003-0003-0003-000000000001';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Kruassan', 'EN', 'Croissant', 'RU', 'Круассан'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Kərə yağı və ləzzət dolu xırıldayan, qat-qat xəmirdən hazırlanmış unudulmaz fransız klassikası.',
                        'EN', 'An unforgettable French classic with butter and taste in a light, flaky pastry.',
                        'RU', 'Незабываемая французская классика на сливочном масле в легком слоеном тесте.'
                    )
                WHERE ""Name"" = 'Croissant' OR ""Id"" = 'a1b2c3d4-0003-0003-0003-000000000002';

                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object('AZ', 'Maffin', 'EN', 'Muffin', 'RU', 'Маффин'),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'AZ', 'Yumşaq, şirin və doyurucu. Hər bir fincan qəhvənin ən yaxşı yoldaşı.',
                        'EN', 'Soft, sweet, and satisfying. The best companion to every cup of coffee.',
                        'RU', 'Нежный, сладкий и сытный. Лучший компаньон к чашке ароматного кофе.'
                    )
                WHERE ""Name"" = 'Muffin' OR ""Id"" = 'a1b2c3d4-0003-0003-0003-000000000003';
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescriptionTranslations",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "NameTranslations",
                table: "Products");
        }
    }
}
