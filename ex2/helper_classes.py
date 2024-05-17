import numpy as np
from numpy.core.multiarray import array as array


EPSILON = 1e-6


def normalize(vector: np.array) -> np.array:
    """This function gets a vector and returns its normalized form."""
    return vector / np.linalg.norm(vector)


def reflected(vector: np.array, normal: np.array) -> np.array:
    """This function gets a vector and the normal of the surface it hit
    This function returns the vector that reflects from the surface"""
    return vector - (2 * np.dot(vector, normal) * normal)


class Object3D:
    def set_material(self, ambient: np.array, diffuse: np.array, specular: np.array, shininess: float, reflection: float):
        self.ambient = np.array(ambient)
        self.diffuse = np.array(diffuse)
        self.specular = np.array(specular)
        self.shininess = shininess
        self.reflection = reflection

    def compute_normal(self, intersection_point: np.array) -> np.array:
        """Computes the normal to the surface at the intersection point."""
        pass

    def calc_diffuse(self, light_intensity: np.array, normal: np.array, light_ray_direction: np.array) -> np.array:
        return light_intensity * self.diffuse * np.dot(normal, light_ray_direction)
    
    def calc_specular(self, light_intensity: np.array, direction_to_camera: np.array, reflected_light_direction: np.array) -> np.array:
        return self.specular * light_intensity * (np.power(np.dot(direction_to_camera, reflected_light_direction), self.shininess))


class Ray:
    def __init__(self, origin: np.array, direction: np.array):
        self.origin = origin
        self.direction = normalize(direction)

    def nearest_intersected_object(self, objects: list[Object3D]) -> tuple[float, Object3D]:
        """The function is getting the collection of objects in the scene and looks for the one with minimum distance.
        The function should return the nearest object and its distance (in two different arguments)"""
        nearest_intersected_object = None
        min_distance = np.inf
        
        for obj in objects:
            t, intersected_object = obj.intersect(self)
            if intersected_object is not None and 0 < t < min_distance:
                min_distance, nearest_intersected_object = t, intersected_object

        return min_distance, nearest_intersected_object
    

class Plane(Object3D):
    def __init__(self, normal, point):
        self.normal = normalize(np.array(normal))
        self.point = np.array(point)

    def intersect(self, ray: Ray) -> tuple[float, Object3D]:
        nominator = np.dot(self.point - ray.origin, self.normal)
        denominator = np.dot(self.normal, ray.direction) + EPSILON

        t = nominator / denominator
        
        if t < EPSILON:
            return np.inf, None
        else:
            return t, self 

    def compute_normal(self, intersection_point: np.array) -> np.array:
        return self.normal

class Triangle(Object3D):
    """
        C
        /\
       /  \
    A /____\ B

    The front face of the triangle is A -> B -> C.
    
    """
    def __init__(self, a, b, c):
        self.a = np.array(a)
        self.b = np.array(b)
        self.c = np.array(c)
        self.normal = self.compute_normal()

    def compute_normal(self, intersection_point: np.array=None) -> np.array:
        """computes the normal to the triangle surface. Pay attention to its direction!"""
        return normalize(np.cross(self.b - self.a, self.c - self.a))

    def intersect(self, ray: Ray) -> tuple[float, Object3D]:
        AB = self.b - self.a
        AC = self.c - self.a

        p = np.cross(ray.direction, AC)
        denominator = np.dot(AB, p)
        if abs(denominator) < EPSILON:
            return np.inf, None

        # Calculate barycentric coordinates
        p = np.cross(ray.direction, AC)
        denominator = np.dot(AB, p)
        if abs(denominator) < EPSILON:
            return np.inf, None

        f = 1.0 / denominator
        s = ray.origin - self.a
        alpha = f * np.dot(s, p)
        if alpha < 0.0:
            return np.inf, None

        q = np.cross(s, AB)
        beta = f * np.dot(ray.direction, q)
        if beta < 0.0 or alpha + beta > 1.0:
            return np.inf, None

        t = f * np.dot(AC, q)

        if t > EPSILON:
            return t, self

        return np.inf, None

    def barycentric_coordinates(self, point: np.array) -> np.array:
        """
        Compute the barycentric coordinates of a point with respect to the triangle.
        """
        v0 = self.b - self.a
        v1 = self.c - self.a
        v2 = point - self.a

        d00 = np.dot(v0, v0)
        d01 = np.dot(v0, v1)
        d11 = np.dot(v1, v1)
        d20 = np.dot(v2, v0)
        d21 = np.dot(v2, v1)

        denom = d00 * d11 - d01 * d01
        u = (d11 * d20 - d01 * d21) / denom
        v = (d00 * d21 - d01 * d20) / denom
        w = 1 - u - v

        return np.array([u, v, w])
        

class Pyramid(Object3D):
    """     
            D
            /\*\
           /==\**\
         /======\***\
       /==========\***\
     /==============\****\
   /==================\*****\
A /&&&&&&&&&&&&&&&&&&&&\ B &&&/ C
   \==================/****/
     \==============/****/
       \==========/****/
         \======/***/
           \==/**/
            \/*/
             E 
    
    Similar to Triangle, every from face of the diamond's faces are:
        A -> B -> D
        B -> C -> D
        A -> C -> B
        E -> B -> A
        E -> C -> B
        C -> E -> A
    """
    def __init__(self, v_list: list[np.array]):
        self.v_list = v_list
        self.triangle_list = self.create_triangle_list()

    def create_triangle_list(self) -> list[Triangle]:
        t_idx = [
                [0,1,3],
                [1,2,3],
                [0,3,2],
                 [4,1,0],
                 [4,2,1],
                 [2,4,0]]
        
        return [Triangle(self.v_list[t[0]], self.v_list[t[1]], self.v_list[t[2]]) for t in t_idx]


    def apply_materials_to_triangles(self):
        for t in self.triangle_list:
            t.set_material(self.ambient, self.diffuse, self.specular, self.shininess, self.reflection)

    def intersect(self, ray: Ray) -> tuple[float, Object3D]:
        min_t = np.inf
        intersected_triangle = None
        for triangle in self.triangle_list:
            t, _ = triangle.intersect(ray)
            if t and t < min_t:
                min_t = t
                intersected_triangle = triangle

        return min_t, intersected_triangle

    def compute_normal(self, intersection_point: np.array) -> np.array:
        raise NotImplementedError("This function is not implemented for Pyramid object, use Triangle instead.")

class Sphere(Object3D):
    def __init__(self, center: np.array, radius: float):
        self.center = center
        self.radius = radius

    def intersect(self, ray: Ray) -> tuple[float, Object3D]:
        o_to_c = ray.origin - self.center
        a = np.dot(ray.direction, ray.direction)
        b = 2.0 * np.dot(o_to_c, ray.direction)
        c = np.dot(o_to_c, o_to_c) - self.radius ** 2

        discriminant = b**2 - 4*a*c

        if discriminant < 0:
            return np.inf, None

        t1 = (-b + np.sqrt(discriminant)) / (2.0 * a)
        t2 = (-b - np.sqrt(discriminant)) / (2.0 * a)

        if t1 > 0 and t2 > 0:
            t = min(t1, t2)
        elif t1 > 0:
            t = t1
        elif t2 > 0:
            t = t2
        else:
            return np.inf, None

        return t, self
    
    def compute_normal(self, intersection_point: np.array) -> np.array:
        return normalize(intersection_point - self.center)

    
class LightSource:
    def __init__(self, intensity: np.array, color: np.array = np.array([1, 1, 1])):
        self.intensity = intensity
        self.color = color

    def get_light_ray(self, intersection: np.array) -> Ray:
        """This function returns the ray that goes from the light source to a point"""
        pass

    def get_distance_from_light(self, intersection: np.array) -> float:
        """This function returns the distance from a point to the light source"""
        pass

    def get_intensity(self, intersection: np.array) -> float:
        """This function returns the light intensity at a point"""
        pass

    def get_direction(self, intersection: np.array) -> np.array:
        """This function returns the direction from the light source to the intersection point"""
        pass


class DirectionalLight(LightSource):

    def __init__(self, intensity: np.array, direction: np.array):
        super().__init__(intensity)
        self.direction = normalize(direction)

    def get_light_ray(self, intersection_point: np.array):
        return Ray(intersection_point, normalize(self.direction))

    def get_distance_from_light(self, intersection: np.array) -> float:
        return np.inf

    def get_intensity(self, intersection: np.array) -> float:
        return self.intensity
    
    def get_direction(self, intersection: np.array) -> np.array:
        return -self.direction


class PointLight(LightSource):
    def __init__(self, intensity: np.array, position: np.array, kc: float, kl: float, kq: float):
        super().__init__(intensity)
        self.position = np.array(position)
        self.kc = kc
        self.kl = kl
        self.kq = kq

    def get_light_ray(self, intersection: np.array):
        return Ray(intersection, normalize(self.position - intersection))

    def get_distance_from_light(self,intersection) -> float:
        return np.linalg.norm(intersection - self.position)

    def get_intensity(self, intersection: np.array) -> float:
        d = self.get_distance_from_light(intersection)
        return self.intensity / (self.kc + self.kl*d + self.kq * (d**2))
    
    def get_direction(self, intersection: np.array) -> np.array:
        return normalize(intersection - self.position)
    

class SpotLight(LightSource):
    def __init__(self, intensity: np.array, position: np.array, direction: np.array, kc: float, kl: float, kq: float):
        super().__init__(intensity)
        self.position = position
        self.direction = normalize(direction)
        self.kc = kc
        self.kl = kl
        self.kq = kq

    def get_light_ray(self, intersection: np.array):
        return Ray(intersection, normalize(self.position - intersection))

    def get_distance_from_light(self, intersection: np.array) -> float:
        return np.linalg.norm(intersection - self.position)

    def get_intensity(self, intersection: np.array) -> float:
        intensity_factor = np.dot(normalize(intersection - self.position), -self.direction)
        d = self.get_distance_from_light(intersection)
        return (self.intensity * intensity_factor) / (self.kc + self.kl * d + self.kq * (d ** 2))
    
    def get_direction(self, intersection: np.array) -> np.array:
        return normalize(intersection - self.position)
