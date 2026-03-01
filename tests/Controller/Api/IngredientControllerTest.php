<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\Ingredient;
use App\Entity\User;
use Liip\TestFixturesBundle\Services\DatabaseToolCollection;
use Liip\TestFixturesBundle\Services\DatabaseTools\AbstractDatabaseTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class IngredientControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private AbstractDatabaseTool $databaseTool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = static::createClient();
        $this->databaseTool = self::getContainer()->get(DatabaseToolCollection::class)->get();

        // 1. テストデータの初期化 (Userを含む)
        $this->databaseTool->loadAliceFixture([
            self::getContainer()->getParameter('kernel.project_dir').'/tests/Fixtures/users.yaml',
            self::getContainer()->getParameter('kernel.project_dir').'/tests/Fixtures/ingredients.yaml',
        ]);

        // 2. テスト用ユーザーを取得してログイン状態にする
        $userRepository = self::getContainer()->get('doctrine')->getRepository(User::class);
        $testUser = $userRepository->findOneBy(['email' => 'admin@example.com']);
        $this->client->loginUser($testUser);
    }

    /**
     * 一覧取得 (GET /api/ingredient) のテスト.
     */
    public function testIndex(): void
    {
        $this->client->request('GET', '/api/ingredient');

        $this->assertResponseIsSuccessful();
        $responseContent = $this->client->getResponse()->getContent();
        $this->assertJson($responseContent);

        $data = json_decode($responseContent, true);
        $this->assertGreaterThanOrEqual(3, count($data));
    }

    /**
     * 新規作成 (POST /api/ingredient/new) のテスト.
     */
    public function testCreate(): void
    {
        // CSRFトークンの取得
        $this->client->request('GET', '/api/ingredient/csrf-token/ingredient_form');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        // 新規作成リクエスト
        $this->client->request(
            'POST',
            '/api/ingredient/new',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'name' => 'テスト用しお',
                'isStock' => true,
                '_token' => $csrfToken,
            ])
        );

        $this->assertResponseStatusCodeSame(201);

        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'テスト用しお']);
        $this->assertNotNull($ingredient);
    }

    /**
     * 編集 (POST /api/ingredient/edit/{id}) のテスト.
     */
    public function testEdit(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'にんじん']);
        $id = $ingredient->getId();

        $this->client->request('GET', '/api/ingredient/csrf-token/ingredient_form');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        $this->client->request(
            'POST',
            "/api/ingredient/edit/$id",
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'name' => 'にんじん（更新済み）',
                'isStock' => false,
                '_token' => $csrfToken,
            ])
        );

        $this->assertResponseStatusCodeSame(201);

        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $updated = $repo->find($id);
        $this->assertSame('にんじん（更新済み）', $updated->getName());
        $this->assertFalse($updated->isStock());
    }

    /**
     * 削除 (DELETE /api/ingredient/delete/{id}) のテスト.
     */
    public function testDelete(): void
    {
        $repo = self::getContainer()->get('doctrine')->getRepository(Ingredient::class);
        $ingredient = $repo->findOneBy(['name' => 'たまねぎ']);
        $id = $ingredient->getId();

        $this->client->request('GET', '/api/ingredient/csrf-token/ingredient_form');
        $csrfToken = json_decode($this->client->getResponse()->getContent(), true)['token'];

        $this->client->request(
            'DELETE',
            "/api/ingredient/delete/$id",
            [],
            [],
            ['HTTP_X-CSRF-TOKEN' => $csrfToken]
        );

        $this->assertResponseIsSuccessful();

        self::getContainer()->get('doctrine')->getManager()->clear();
        $this->assertNull($repo->find($id));
    }
}
