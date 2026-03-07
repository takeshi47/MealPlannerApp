<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\Daily;
use App\Entity\Menu;
use App\Entity\User;
use App\Tests\DataFixtures\AppFixtures;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class DailyControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private AbstractDatabaseTool $databaseTool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();

        // テストデータの初期化 (AppFixturesを使用)
        $this->databaseTool->loadFixtures([
            AppFixtures::class
        ]);

        // テスト用ユーザーを取得してログイン状態にする
        $userRepository = self::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy(['email' => 'admin@example.com']);
        $this->client->loginUser($testUser);
    }

    /**
     * 初期データ取得 (GET /api/daily/init-data) のテスト.
     */
    public function testGetInitData(): void
    {
        $this->client->request('GET', '/api/daily/init-data');

        $this->assertResponseIsSuccessful();
        $responseContent = $this->client->getResponse()->getContent();
        $this->assertJson($responseContent);

        $data = json_decode($responseContent, true);
        $this->assertArrayHasKey('mealTypes', $data);
        $this->assertArrayHasKey('config', $data);

        $mealTypeValues = array_column($data['mealTypes'], 'value');
        $this->assertContains('breakfast', $mealTypeValues);
    }

    /**
     * 指定期間の献立取得 (POST /api/daily) のテスト.
     */
    public function testFetch(): void
    {
        $this->client->request(
            'POST',
            '/api/daily',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'viewMode' => 'day', // ViewMode Enum の値
                'baseDate' => '2026-03-01',
            ])
        );

        $this->assertResponseIsSuccessful();
        $responseContent = $this->client->getResponse()->getContent();
        $this->assertJson($responseContent);

        $data = json_decode($responseContent, true);

        // 戻り値は数値添字配列なので、dateフィールドを持つ要素があるか確認
        $dates = array_map(fn($item) => (new \DateTime($item['date']))->format('Y-m-d'), $data);
        $this->assertContains('2026-03-01', $dates);
    }

    /**
     * 新規作成 (POST /api/daily/create) のテスト.
     */
    public function testCreate(): void
    {
        $this->client->request('GET', '/api/daily/csrf-token/daily_create');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        $menuRepo = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $menuRepo->findOneBy(['name' => 'カレー']);

        // 新規作成リクエスト (2026-03-10 分)
        $this->client->request(
            'POST',
            '/api/daily/create',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'date' => '2026-03-10',
                'meals' => [
                    [
                        'mealType' => 'lunch',
                        'menu' => [$menu->getId()]
                    ]
                ],
                '_token' => $csrfToken,
            ])
        );

        $this->assertResponseIsSuccessful();

        $dailyRepo = self::getContainer()->get('doctrine')->getRepository(Daily::class);
        $daily = $dailyRepo->findOneBy(['date' => new \DateTime('2026-03-10')]);
        $this->assertNotNull($daily);
        $this->assertCount(1, $daily->getMeals());
        $this->assertSame('lunch', $daily->getMeals()->first()->getMealType());
    }

    /**
     * 更新 (POST /api/daily/update/{id}) のテスト.
     */
    public function testUpdate(): void
    {
        // CSRFトークンの取得 (DailyTypeのIDは daily_form)
        $this->client->request('GET', '/api/daily/csrf-token/daily_create');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        $dailyRepo = self::getContainer()->get('doctrine')->getRepository(Daily::class);
        $daily = $dailyRepo->findOneBy(['date' => new \DateTime('2026-03-01')]);
        $id = $daily->getId();

        $menuRepo = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $menuRepo->findOneBy(['name' => '野菜炒め']);

        // 更新リクエスト (既存の3つの食事を1つに置き換える)
        // DailyTypeのsubmit(..., true) により、送信されなかった既存のMealは削除されるはず
        $this->client->request(
            'POST',
            "/api/daily/update/$id",
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'date' => '2026-03-01',
                'meals' => [
                    [
                        'mealType' => 'breakfast', // 重複しないようにbreakfastにする
                        'menu' => [$menu->getId()]
                    ]
                ],
                '_token' => $csrfToken,
            ])
        );

        $this->assertResponseIsSuccessful();

        self::getContainer()->get('doctrine')->getManager()->clear();
        $updatedDaily = $dailyRepo->find($id);
        $this->assertCount(1, $updatedDaily->getMeals());
        $this->assertSame('breakfast', $updatedDaily->getMeals()->first()->getMealType());
    }
}
