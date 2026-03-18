<?php

declare(strict_types=1);

namespace App\Controller\Api;

use Symfony\Component\Form\FormInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;

trait ApiControllerTrait
{
    #[Route(path: '/csrf-token/{tokenId}', name: 'csrf_token', methods: ['GET'])]
    public function getCsrfToken(string $tokenId, CsrfTokenManagerInterface $csrfTokenManager): Response
    {
        $token = $csrfTokenManager->getToken($tokenId)->getValue();

        return $this->json(['token' => $token]);
    }

    private function clearCsrfToken(string $tokenId): void
    {
        // /todo
    }

    /**
     * todo: リファクタリング（getErrorsFromForm2との統合）.
     *
     * @deprecated
     */
    private function getErrorsFromForm(FormInterface $form): array
    {
        $errors = [];

        // 1. 現在のフォーム/フィールド自身に紐づくグローバルなエラーを取得
        foreach ($form->getErrors() as $error) {
            $cause = $error->getCause();
            if ($error->getOrigin()->getParent() === null && method_exists($cause, 'getPropertyPath')) {
                $path = str_replace(['data', '.'], '', $cause->getPropertyPath());
                $errors[$path][] = $error->getMessage(); // エラーメッセージを配列に追加
            } else {
                $errors[] = $error->getMessage(); // エラーメッセージを配列に追加
            }
        }

        // 2. 各子フィールドのエラーを再帰的に取得
        foreach ($form->all() as $childForm) {
            // 子フォームに対して自分自身（getErrorsFromForm）を再帰的に呼び出す
            if ($childErrors = $this->getErrorsFromForm($childForm)) {
                // 子フォームからエラーが返された場合、その子フォームの名前をキーとしてエラー配列に格納
                $errors[$childForm->getName()] = $childErrors;
            }
        }

        return $errors; // 整形されたエラー配列を返す
    }

    // todo: リファクタリング（getErrorsFromFormとの統合）
    private function getErrorsFromForm2(FormInterface $form, string $prefix = ''): array
    {
        $errors = [];

        // 1. 現在のフォームに紐づいているエラーを処理する
        foreach ($form->getErrors() as $error) {
            $origin = $error->getOrigin();
            $key = $prefix ?: 'global';

            if ($origin && $origin !== $form) {
                $childName = $origin->getName();
                $key = $prefix ? $prefix.'.'.$childName : $childName;
            }

            $errors[$key][] = $error->getMessage();
        }

        // 2. 子要素を再帰的に回す（ここは今のままでOK！）
        foreach ($form->all() as $child) {
            $childPrefix = $prefix ? $prefix.'.'.$child->getName() : $child->getName();
            $childErrors = $this->getErrorsFromForm2($child, $childPrefix);

            foreach ($childErrors as $key => $messages) {
                $errors[$key] = array_merge($errors[$key] ?? [], $messages);
            }
        }

        return $errors;
    }
}
