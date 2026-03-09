<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Ingredient;
use App\Form\IngredientType;
use App\Repository\IngredientRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/ingredient', name: 'ingredient_')]
final class IngredientController extends AbstractController
{
    use ApiControllerTrait;

    #[Route(name: '', methods: ['GET'])]
    public function index(IngredientRepository $ingredientRepository): Response
    {
        return $this->json($ingredientRepository->findAll(), context: ['groups' => 'ingredient:read']);
    }

    #[Route('/new', name: 'new', methods: ['POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $ingredient = new Ingredient();
        $form = $this->createForm(IngredientType::class, $ingredient);

        $data = json_decode($request->getContent(), true);
        $form->submit($data);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($ingredient);
            $entityManager->flush();

            return new Response(null, Response::HTTP_CREATED);
        }

        return $this->json($this->getErrorsFromForm($form), Response::HTTP_BAD_REQUEST);
    }

    #[Route(path: '/{id}', name: 'fetch', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function getIngredient(Ingredient $ingredient): Response
    {
        return $this->json($ingredient, context: ['groups' => 'ingredient:read']);
    }

    #[Route(path: '/edit/{id}', name: 'edit', methods: ['POST'])]
    public function edit(Request $request, Ingredient $ingredient, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(IngredientType::class, $ingredient);
        $data = json_decode($request->getContent(), true);
        $form->submit($data);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($ingredient);
            $entityManager->flush();

            return new Response(null, Response::HTTP_CREATED);
        }

        return $this->json($this->getErrorsFromForm($form), Response::HTTP_BAD_REQUEST);
    }

    #[Route(path: '/delete/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(Request $request, Ingredient $ingredient, EntityManagerInterface $entityManager): Response
    {
        $submittedToken = $request->headers->get('X-CSRF-TOKEN');

        if (!$this->isCsrfTokenValid('ingredient_form', $submittedToken)) {
            return $this->json(['error' => 'Invalid CSRF TOKEN'], Response::HTTP_BAD_REQUEST);
        }

        if (!$ingredient->canDelete()) {
            return $this->json(['error' => 'この材料はメニューに紐付いているため削除できません。'], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->remove($ingredient);
        $entityManager->flush();

        return new Response();
    }
}
