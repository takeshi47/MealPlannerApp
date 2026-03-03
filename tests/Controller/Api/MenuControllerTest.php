<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\Ingredient;
use App\Entity\Menu;
use App\Entity\User;
use App\Tests\DataFixtures\AppFixtures;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class MenuControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private AbstractDatabaseTool $databaseTool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();

        // テストデータの初期化
        $this->databaseTool->loadFixtures([AppFixtures::class]);

        // テスト用ユーザーを取得してログイン状態にする
        $userRepository = self::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy(['email' => 'admin@example.com']);
        $this->client->loginUser($testUser);
    }

    /**
     * 一覧取得 (GET /api/menu) のテスト.
     */
    public function testFetchAll(): void
    {
        $this->client->request('GET', '/api/menu');

        $this->assertResponseIsSuccessful();
        $responseContent = $this->client->getResponse()->getContent();
        $this->assertJson($responseContent);

        $data = json_decode($responseContent, true);
        $this->assertGreaterThanOrEqual(3, count($data));
    }

    /**
     * 個別取得 (GET /api/menu/{id}) のテスト.
     */
    public function testFetch(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $repo->findOneBy(['name' => 'カレー']);
        $id = $menu->getId();

        $this->client->request('GET', "/api/menu/$id");

        $this->assertResponseIsSuccessful();
        $responseContent = $this->client->getResponse()->getContent();
        $this->assertJson($responseContent);

        $data = json_decode($responseContent, true);
        $this->assertSame('カレー', $data['name']);
    }

    /**
     * 新規作成 (POST /api/menu/new) のテスト.
     */
    public function testNew(): void
    {
        // CSRFトークンの取得
        $this->client->request('GET', '/api/menu/csrf-token/menu_create');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        // 材料のIDを取得
        $ingredientRepo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $ingredientRepo->findOneBy(['name' => 'にんじん']);

        // 新規作成リクエスト
        $this->client->request(
            'POST',
            '/api/menu/new',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'name' => 'テストメニュー新規',
                'ingredients' => [$ingredient->getId()],
                '_token' => $csrfToken,
            ])
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $repo = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $repo->findOneBy(['name' => 'テストメニュー新規']);
        $this->assertNotNull($menu);
        $this->assertCount(1, $menu->getIngredients());
    }

    /**
     * 更新 (PUT /api/menu/{id}) のテスト.
     */
    public function testUpdate(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $repo->findOneBy(['name' => 'カレー']);
        $id = $menu->getId();

        // CSRFトークンの取得 (MenuTypeはcsrf_token_idがmenu_createに設定されている)
        $this->client->request('GET', '/api/menu/csrf-token/menu_create');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        // 材料のIDを取得
        $ingredientRepo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient1 = $ingredientRepo->findOneBy(['name' => 'にんじん']);
        $ingredient2 = $ingredientRepo->findOneBy(['name' => 'たまねぎ']);

        // 更新リクエスト
        $this->client->request(
            'PUT',
            "/api/menu/$id",
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'name' => 'カレー（更新済み）',
                'ingredients' => [$ingredient1->getId(), $ingredient2->getId()],
                '_token' => $csrfToken,
            ])
        );

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        self::getContainer()->get('doctrine')->getManager()->clear();
        $updated = $repo->find($id);
        $this->assertSame('カレー（更新済み）', $updated->getName());
        $this->assertCount(2, $updated->getIngredients());
    }

    /**
     * 削除 (DELETE /api/menu/delete/{id}) のテスト.
     */
    public function testDelete(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Menu::class);
        $menu = $repo->findOneBy(['name' => '野菜炒め']);
        $id = $menu->getId();

        // CSRFトークンの取得 (deleteはmenu_deleteを使用)
        $this->client->request('GET', '/api/menu/csrf-token/menu_delete');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        $this->client->request(
            'DELETE',
            "/api/menu/delete/$id",
            [],
            [],
            ['HTTP_X-CSRF-TOKEN' => $csrfToken]
        );

        $this->assertResponseIsSuccessful();

        self::getContainer()->get('doctrine')->getManager()->clear();
        $this->assertNull($repo->find($id));
    }
}
