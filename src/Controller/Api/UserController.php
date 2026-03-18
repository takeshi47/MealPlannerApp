<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Form\UserType;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route(path: '/user', name: 'user_')]
final class UserController extends AbstractController
{
    use ApiControllerTrait;

    #[Route(name: 'index', methods: ['GET'])]
    public function index(UserRepository $userRepository): Response
    {
        return $this->json($userRepository->findAll(), context: ['groups' => 'user:read']);
    }

    #[Route(path: '/{id}', name: 'fetch', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function fetchUser(User $user): Response
    {
        return $this->json($user, context: ['groups' => 'user:read']);
    }

    #[Route('/new', name: 'new', methods: ['POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $user = new User();
        $form = $this->createForm(UserType::class, $user, [
            'validation_groups' => ['Default', 'registration'],
        ]);

        $data = json_decode($request->getContent(), true);
        $form->submit($data);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($user);
            $entityManager->flush();

            // todo: csrfTokenの削除処理

            return $this->json(null, Response::HTTP_CREATED);
        }

        $errors = $this->getErrorsFromForm2($form);

        return $this->json($errors, Response::HTTP_BAD_REQUEST);
    }

    #[Route(path: '/{id}', name: 'edit', methods: ['POST'])]
    public function edit(Request $request, User $user, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(UserType::class, $user, [
            'validation_groups' => ['Default', 'edit'],
        ]);

        $data = json_decode($request->getContent(), true);
        $form->submit($data);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($user);
            $entityManager->flush();

            return $this->json(null, Response::HTTP_CREATED);
        }

        $errors = $this->getErrorsFromForm2($form);

        return $this->json($errors, Response::HTTP_BAD_REQUEST);
    }

    #[Route('/{id}', name: 'user_delete', methods: ['DELETE'])]
    public function delete(Request $request, User $user, EntityManagerInterface $entityManager): Response
    {
        $submittedToken = $request->headers->get('X-CSRF-TOKEN');

        if (!$this->isCsrfTokenValid('user_delete_'.$user->getId(), $submittedToken)) {
            return $this->json(['error' => 'Invalid CSRF token.'], Response::HTTP_FORBIDDEN);
        }

        $entityManager->remove($user);
        $entityManager->flush();

        return new Response();
    }
}
